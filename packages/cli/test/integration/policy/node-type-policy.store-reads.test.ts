import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { TypeAvailabilityPolicyAttachmentRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy-attachment.repository';
import { TypeAvailabilityPolicyScopeRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy.repository';
import type { PolicyRule } from '@/modules/type-availability-policies/policy-rule.types';
import { TypeAvailabilityPolicySnapshot } from '@/modules/type-availability-policies/type-availability-policy-snapshot';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { reloadPolicySnapshot } from './shared/policy-snapshot';

/**
 * Pins how many SQL statements a policy decision and a snapshot reload cost.
 *
 * `workflowStart` gets 250 ms and blocks the execution when it overruns, so a loaded snapshot
 * must answer with no query at all.
 */

const KIND = 'node-types';
const CREDENTIAL_KIND = 'credential-types';
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
		await reloadPolicySnapshot();
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

	const decide = async (projectId: string | null, kind = KIND) =>
		await service.evaluateComposedTypesFor(kind, projectId, TYPES);

	async function configureScope(projectId: string | null, withAttachment: boolean, kind = KIND) {
		const { scope } = await scopeRepo.createScopeIfAbsent(
			{ kind, projectId, defaultAction: 'allow', updatedBy: 'user-1' },
			ROOT,
		);

		const policy = await policyRepo.createPolicy(
			{ kind, rules: [DENY_SLACK], updatedBy: 'user-1' },
			ROOT,
		);

		if (withAttachment) {
			await service.replaceAttachments(
				kind,
				scope.id,
				[{ policyId: policy.id, priority: 1, isFloor: false }],
				scope.version,
				'user-1',
			);
		}

		return { scope, policy };
	}

	describe('a decision with the snapshot loaded', () => {
		test('costs no queries when nothing is configured', async () => {
			const project = await createTeamProject();

			expect(await countQueries(async () => await decide(null))).toBe(0);
			expect(await countQueries(async () => await decide(project.id))).toBe(0);
		});

		test('costs no queries when both scopes are configured with an attachment', async () => {
			const project = await createTeamProject();
			await configureScope(null, true);
			await configureScope(project.id, true);

			expect(await countQueries(async () => await decide(project.id))).toBe(0);
		});

		test('costs no queries for both kinds, as two registered checks make', async () => {
			const project = await createTeamProject();
			for (const kind of [KIND, CREDENTIAL_KIND]) {
				await configureScope(null, true, kind);
				await configureScope(project.id, true, kind);
			}

			const count = await countQueries(
				async () => await Promise.all([decide(project.id), decide(project.id, CREDENTIAL_KIND)]),
			);

			expect(count).toBe(0);
		});

		test('costs no queries for many types', async () => {
			const project = await createTeamProject();
			await configureScope(null, true);
			await configureScope(project.id, true);
			const manyTypes = Array.from({ length: 1_400 }, (_, i) => `n8n-nodes-base.type${i}`);

			const count = await countQueries(
				async () => await service.evaluateComposedTypesFor(KIND, project.id, manyTypes),
			);

			expect(count).toBe(0);
		});

		// `credentialDecrypt` runs for each credential fetch, so a burst is the normal shape.
		test('costs no queries for a burst, and gives every caller the same verdict', async () => {
			await configureScope(null, true);
			let results: Array<Awaited<ReturnType<typeof decide>>> = [];

			const count = await countQueries(async () => {
				results = await Promise.all(Array.from({ length: 100 }, async () => await decide(null)));
			});

			expect(count).toBe(0);
			expect(results.every(({ verdicts }) => verdicts[0].action === 'deny')).toBe(true);
		});
	});

	describe('a snapshot reload', () => {
		test('costs 2 queries when nothing is configured', async () => {
			expect(await countQueries(async () => await reloadPolicySnapshot())).toBe(2);
		});

		test('costs the same 4 queries for one configured project or twenty', async () => {
			await configureScope(null, true);
			expect(await countQueries(async () => await reloadPolicySnapshot())).toBe(4);

			for (let i = 0; i < 20; i++) {
				await configureScope((await createTeamProject()).id, true);
			}
			expect(await countQueries(async () => await reloadPolicySnapshot())).toBe(4);
		});
	});

	describe('before the snapshot loads', () => {
		test('reads the database and reaches the same verdict', async () => {
			const project = await createTeamProject();
			await configureScope(null, true);
			await configureScope(project.id, true);

			const unloaded = new TypeAvailabilityPolicySnapshot(
				scopeRepo,
				Container.get(TypeAvailabilityPolicyAttachmentRepository),
				Container.get(Publisher),
				Container.get(Logger),
			);
			const coldService = new TypeAvailabilityPolicyService(
				policyRepo,
				scopeRepo,
				Container.get(TypeAvailabilityPolicyAttachmentRepository),
				Container.get(TransactionRunner),
				Container.get(EventService),
				unloaded,
				Container.get(LoadNodesAndCredentials),
				Container.get(NodeTypes),
			);

			let action: string | undefined;
			const count = await countQueries(async () => {
				const result = await coldService.evaluateComposedTypesFor(KIND, project.id, [SLACK]);
				action = result.verdicts[0].action;
			});

			expect(count).toBe(6);
			expect(action).toBe('deny');
		});
	});

	/** Each warms the snapshot first, so a write that does not reload shows the old verdict. */
	describe('a write reloads the snapshot', () => {
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
				KIND,
				scope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				scope.version,
				'user-1',
			);

			expect(await slackVerdict(null)).toBe('deny');
		});

		test('updatePolicyDocument, on every scope it is attached to', async () => {
			const project = await createTeamProject();
			const { scope, policy } = await configureScope(null, true);
			const { scope: projectScope } = await configureScope(project.id, false);
			await service.replaceAttachments(
				KIND,
				projectScope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				projectScope.version,
				'user-1',
			);
			expect(await slackVerdict(null)).toBe('deny');
			expect(await slackVerdict(project.id)).toBe('deny');

			await service.updatePolicyDocument(KIND, policy.id, [], policy.version, 'user-1');

			expect(await slackVerdict(null)).toBe('allow');
			expect(await slackVerdict(project.id)).toBe('allow');
			expect(scope.id).not.toBe(projectScope.id);
		});
	});
});
