import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';

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
 * One policy document attached to several scopes, edited once.
 *
 * The edit writes the document and bumps a version row for every scope the document reaches.
 * Those writes are what the `version` freshness signal rests on, so a fan-out that lands
 * partly leaves some scopes claiming rules they no longer enforce.
 */

const KIND = 'node-types';
const ROOT: OperationContext = {};
const SLACK = 'n8n-nodes-base.slack';

const DENY_SLACK: PolicyRule = {
	id: 'rule-1',
	action: 'deny',
	selector: { kind: 'name', value: SLACK },
};

describe('node type policy document fan-out', () => {
	let service: TypeAvailabilityPolicyService;
	let policyRepo: TypeAvailabilityPolicyRepository;
	let scopeRepo: TypeAvailabilityPolicyScopeRepository;

	beforeAll(async () => {
		await testModules.loadModules(['type-availability-policies']);
		await testDb.init();
		service = Container.get(TypeAvailabilityPolicyService);
		policyRepo = Container.get(TypeAvailabilityPolicyRepository);
		scopeRepo = Container.get(TypeAvailabilityPolicyScopeRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'TypeAvailabilityPolicyAttachment',
			'TypeAvailabilityPolicyScope',
			'TypeAvailabilityPolicy',
		]);
		await reloadPolicySnapshot();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** The instance scope and two project scopes, all carrying the one document. */
	async function attachToThreeScopes() {
		const policy = await policyRepo.createPolicy(
			{ kind: KIND, rules: [DENY_SLACK], updatedBy: 'user-1' },
			ROOT,
		);

		const projectIds = [null, (await createTeamProject()).id, (await createTeamProject()).id];
		const scopes = [];

		for (const projectId of projectIds) {
			const { scope } = await scopeRepo.createScopeIfAbsent(
				{ kind: KIND, projectId, defaultAction: 'allow', updatedBy: 'user-1' },
				ROOT,
			);
			await service.replaceAttachments(
				KIND,
				scope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				scope.version,
				'user-1',
			);
			scopes.push(scope);
		}

		return { policy, scopes, projectIds };
	}

	async function versionsOf(scopes: Array<{ id: string }>) {
		return await Promise.all(
			scopes.map(async (scope) => (await scopeRepo.findScopeById(scope.id, ROOT))?.version),
		);
	}

	const slackVerdict = async (projectId: string | null) =>
		(await service.evaluateComposedTypesFor(KIND, projectId, [SLACK])).verdicts[0].action;

	it('bumps the version of all three scopes and frees the type in each', async () => {
		const { policy, scopes, projectIds } = await attachToThreeScopes();
		expect(await versionsOf(scopes)).toEqual([2, 2, 2]);

		await service.updatePolicyDocument(KIND, policy.id, [], policy.version, 'user-1');

		expect(await versionsOf(scopes)).toEqual([3, 3, 3]);
		for (const projectId of projectIds) {
			expect(await slackVerdict(projectId)).toBe('allow');
		}
	});

	it('leaves all three versions alone when the edit fails after the bumps', async () => {
		const { policy, scopes, projectIds } = await attachToThreeScopes();

		// Throws with the bumps already written, so only a rollback can undo them.
		const bumpVersions = scopeRepo.bumpVersions.bind(scopeRepo);
		const afterTheBumps = vi
			.spyOn(scopeRepo, 'bumpVersions')
			.mockImplementationOnce(async (ids, ctx) => {
				await bumpVersions(ids, ctx);
				throw new Error('fan-out interrupted');
			});

		await expect(
			service.updatePolicyDocument(KIND, policy.id, [], policy.version, 'user-1'),
		).rejects.toThrow('fan-out interrupted');

		// Without this the rest passes for the wrong reason: no bump, so nothing to roll back.
		expect(afterTheBumps).toHaveBeenCalled();
		expect(await versionsOf(scopes)).toEqual([2, 2, 2]);
		expect((await policyRepo.findByIdAndKind(policy.id, KIND, ROOT))?.rules).toEqual([DENY_SLACK]);

		await reloadPolicySnapshot();
		for (const projectId of projectIds) {
			expect(await slackVerdict(projectId)).toBe('deny');
		}
	});

	/** A second main holds its own snapshot and learns of the edit from the reload command. */
	it('serves the committed edit to a second main once it gets the reload command', async () => {
		const { policy, projectIds } = await attachToThreeScopes();

		const secondSnapshot = new TypeAvailabilityPolicySnapshot(
			Container.get(TypeAvailabilityPolicyScopeRepository),
			Container.get(TypeAvailabilityPolicyAttachmentRepository),
			Container.get(Publisher),
			Container.get(Logger),
		);
		await secondSnapshot.reload();

		const secondMain = new TypeAvailabilityPolicyService(
			Container.get(TypeAvailabilityPolicyRepository),
			Container.get(TypeAvailabilityPolicyScopeRepository),
			Container.get(TypeAvailabilityPolicyAttachmentRepository),
			Container.get(TransactionRunner),
			Container.get(EventService),
			secondSnapshot,
			Container.get(LoadNodesAndCredentials),
			Container.get(NodeTypes),
		);

		const verdictOnSecondMain = async (projectId: string | null) =>
			(await secondMain.evaluateComposedTypesFor(KIND, projectId, [SLACK])).verdicts[0].action;

		for (const projectId of projectIds) {
			expect(await verdictOnSecondMain(projectId)).toBe('deny');
		}

		await service.updatePolicyDocument(KIND, policy.id, [], policy.version, 'user-1');

		// Proves the command is what moves the second main, not a read that reached the database.
		expect(await verdictOnSecondMain(null)).toBe('deny');

		await secondSnapshot.handleReloadRequest();

		for (const projectId of projectIds) {
			expect(await verdictOnSecondMain(projectId)).toBe('allow');
		}
	});
});
