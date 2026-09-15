import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TypeAvailabilityPolicyScopeRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy.repository';
import type { PolicyRule } from '@/modules/type-availability-policies/policy-rule.types';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';

import { clearPolicyCache } from './shared/policy-cache';

/**
 * Pins how many SQL statements one policy decision costs, cold and warm.
 *
 * `workflowStart` gets 250 ms and blocks the execution when it overruns, so this is a
 * correctness budget rather than a performance nicety. The cold numbers are the ones quoted
 * in the IAM-1385 PR body.
 */

const KIND = 'node-types';
const ROOT: OperationContext = {};

const DENY_SLACK: PolicyRule = {
	id: 'rule-1',
	action: 'deny',
	selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
};

const SLACK = 'n8n-nodes-base.slack';
const TYPES = [SLACK, 'n8n-nodes-base.code', 'n8n-nodes-base.set'];

describe('node type policy store reads', () => {
	let service: TypeAvailabilityPolicyService;
	let policyRepo: TypeAvailabilityPolicyRepository;
	let scopeRepo: TypeAvailabilityPolicyScopeRepository;
	let dataSource: DataSource;

	beforeAll(async () => {
		await testModules.loadModules(['type-availability-policies']);
		await testDb.init();
		service = Container.get(TypeAvailabilityPolicyService);
		policyRepo = Container.get(TypeAvailabilityPolicyRepository);
		scopeRepo = Container.get(TypeAvailabilityPolicyScopeRepository);
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'TypeAvailabilityPolicyAttachment',
			'TypeAvailabilityPolicyScope',
			'TypeAvailabilityPolicy',
		]);
		await clearPolicyCache();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/**
	 * Both drivers call `logger.logQuery` for every statement regardless of the `logging`
	 * option, so swapping the logger counts statements without reconfiguring the connection.
	 * `Object.create` keeps the rest of the logger intact.
	 */
	async function countQueries(run: () => Promise<unknown>): Promise<number> {
		const original = dataSource.logger;
		let count = 0;

		const counting = Object.create(original) as DataSource['logger'];
		counting.logQuery = () => {
			count += 1;
		};
		dataSource.logger = counting;

		try {
			await run();
		} finally {
			dataSource.logger = original;
		}

		return count;
	}

	const decide = async (projectId: string | null) =>
		await service.evaluateComposedTypesFor(KIND, projectId, TYPES);

	async function configureScope(projectId: string | null, withAttachment: boolean) {
		const { scope } = await scopeRepo.createScopeIfAbsent(
			{ kind: KIND, projectId, defaultAction: 'allow', updatedBy: 'user-1' },
			ROOT,
		);

		const policy = await policyRepo.createPolicy(
			{ kind: KIND, rules: [DENY_SLACK], updatedBy: 'user-1' },
			ROOT,
		);

		if (withAttachment) {
			await service.replaceAttachments(
				scope.id,
				[{ policyId: policy.id, priority: 1, isFloor: false }],
				'user-1',
			);
		}

		return { scope, policy };
	}

	describe('a cold decision', () => {
		test('costs 1 query for an unconfigured instance scope', async () => {
			expect(await countQueries(async () => await decide(null))).toBe(1);
		});

		test('costs 2 queries for an instance scope with no attachments', async () => {
			await configureScope(null, false);
			await clearPolicyCache();

			expect(await countQueries(async () => await decide(null))).toBe(2);
		});

		test('costs 3 queries for an instance scope with an attachment', async () => {
			await configureScope(null, true);
			await clearPolicyCache();

			expect(await countQueries(async () => await decide(null))).toBe(3);
		});

		test('costs 2 queries when neither scope is configured', async () => {
			const project = await createTeamProject();

			expect(await countQueries(async () => await decide(project.id))).toBe(2);
		});

		test('costs 6 queries when both scopes are configured with an attachment', async () => {
			const project = await createTeamProject();
			await configureScope(null, true);
			await configureScope(project.id, true);
			await clearPolicyCache();

			expect(await countQueries(async () => await decide(project.id))).toBe(6);
		});
	});

	describe('a warm decision', () => {
		test('costs no queries at all', async () => {
			const project = await createTeamProject();
			await configureScope(null, true);
			await configureScope(project.id, true);
			await clearPolicyCache();

			await decide(project.id);

			expect(await countQueries(async () => await decide(project.id))).toBe(0);
		});

		test('costs no queries for a sub-execution in the same project', async () => {
			const project = await createTeamProject();
			await configureScope(null, true);
			await configureScope(project.id, true);
			await clearPolicyCache();

			const count = await countQueries(async () => {
				for (let i = 0; i < 4; i++) await decide(project.id);
			});

			// The first decision pays for both scopes; the three sub-executions pay nothing.
			expect(count).toBe(6);
		});

		test('reuses the instance scope across projects, so a second project reads only its own', async () => {
			const first = await createTeamProject();
			const second = await createTeamProject();
			await configureScope(null, true);
			await clearPolicyCache();

			await decide(first.id);

			expect(await countQueries(async () => await decide(second.id))).toBe(1);
		});

		test('does not cache the unconfigured instance scope as a miss', async () => {
			await decide(null);

			expect(await countQueries(async () => await decide(null))).toBe(0);
		});
	});

	/**
	 * The cache is only safe because a write drops the entry it changed. Each of these warms
	 * the cache first, so a missing invalidation shows up as the old verdict.
	 */
	describe('a write invalidates what it changed', () => {
		const slackVerdict = async (projectId: string | null) =>
			(await service.evaluateComposedTypesFor(KIND, projectId, [SLACK])).verdicts[0].action;

		test('setDefaultAction', async () => {
			expect(await slackVerdict(null)).toBe('allow');

			await service.setDefaultAction(KIND, null, 'deny', 0, 'user-1');

			expect(await slackVerdict(null)).toBe('deny');
		});

		test('setEffectivePolicy', async () => {
			expect(await slackVerdict(null)).toBe('allow');

			await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [DENY_SLACK], defaultAction: 'allow' },
				0,
				'user-1',
			);

			expect(await slackVerdict(null)).toBe('deny');
		});

		test('replaceAttachments', async () => {
			const { scope, policy } = await configureScope(null, false);
			expect(await slackVerdict(null)).toBe('allow');

			await service.replaceAttachments(
				scope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				'user-1',
			);

			expect(await slackVerdict(null)).toBe('deny');
		});

		test('updatePolicyDocument, on every scope it is attached to', async () => {
			const project = await createTeamProject();
			const { scope, policy } = await configureScope(null, true);
			const { scope: projectScope } = await configureScope(project.id, false);
			await service.replaceAttachments(
				projectScope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				'user-1',
			);
			expect(await slackVerdict(null)).toBe('deny');
			expect(await slackVerdict(project.id)).toBe('deny');

			await service.updatePolicyDocument(policy.id, [], policy.version, 'user-1');

			expect(await slackVerdict(null)).toBe('allow');
			expect(await slackVerdict(project.id)).toBe('allow');
			expect(scope.id).not.toBe(projectScope.id);
		});
	});

	test('the number of types evaluated does not change the query count', async () => {
		const project = await createTeamProject();
		await configureScope(null, true);
		await configureScope(project.id, true);
		await clearPolicyCache();

		const manyTypes = Array.from({ length: 1_400 }, (_, i) => `n8n-nodes-base.type${i}`);

		const count = await countQueries(
			async () => await service.evaluateComposedTypesFor(KIND, project.id, manyTypes),
		);

		expect(count).toBe(6);
	});
});
