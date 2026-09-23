import { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { TypeAvailabilityPolicyAttachmentRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy-attachment.repository';
import { TypeAvailabilityPolicyScopeRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy.repository';
import type { PolicyRule } from '@/modules/type-availability-policies/policy-rule.types';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';
import { CacheService } from '@/services/cache/cache.service';

import { clearPolicyCache } from './shared/policy-cache';

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
		await clearPolicyCache();
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

		// The last read the transaction makes, so it throws with the bumps already written.
		const afterTheBumps = vi
			.spyOn(scopeRepo, 'findScopeKeysByIds')
			.mockRejectedValueOnce(new Error('fan-out interrupted'));

		await expect(
			service.updatePolicyDocument(KIND, policy.id, [], policy.version, 'user-1'),
		).rejects.toThrow('fan-out interrupted');

		// Without this the rest passes for the wrong reason: no bump, so nothing to roll back.
		expect(afterTheBumps).toHaveBeenCalled();
		expect(await versionsOf(scopes)).toEqual([2, 2, 2]);
		expect((await policyRepo.findByIdAndKind(policy.id, KIND, ROOT))?.rules).toEqual([DENY_SLACK]);

		await clearPolicyCache();
		for (const projectId of projectIds) {
			expect(await slackVerdict(projectId)).toBe('deny');
		}
	});

	/**
	 * Multi-main needs queue mode, where `N8N_CACHE_BACKEND=auto` is Redis — so two mains share
	 * one cache, and the entry one drops is the entry the other was reading. A second service
	 * over that shared cache and database models this. Its own 1-second read window is the one
	 * thing the invalidation cannot close, so the edit is served as soon as that lapses. Two
	 * mains given unshared caches (`N8N_CACHE_BACKEND=memory`) stay stale until the TTL instead,
	 * which is out of scope here.
	 */
	it('serves the committed edit to a second main that had already read the old one', async () => {
		const { policy, projectIds } = await attachToThreeScopes();

		const secondMain = new TypeAvailabilityPolicyService(
			Container.get(TypeAvailabilityPolicyRepository),
			Container.get(TypeAvailabilityPolicyScopeRepository),
			Container.get(TypeAvailabilityPolicyAttachmentRepository),
			Container.get(TransactionRunner),
			Container.get(EventService),
			Container.get(CacheService),
			Container.get(LoadNodesAndCredentials),
			Container.get(Logger),
		);

		const verdictOnSecondMain = async (projectId: string | null) =>
			(await secondMain.evaluateComposedTypesFor(KIND, projectId, [SLACK])).verdicts[0].action;

		// Warm the second main first, so a missed invalidation reads as the old verdict.
		for (const projectId of projectIds) {
			expect(await verdictOnSecondMain(projectId)).toBe('deny');
		}

		await service.updatePolicyDocument(KIND, policy.id, [], policy.version, 'user-1');

		// Stands in for the second main's own read window passing, so the test neither waits it
		// out nor asserts on wall clock. The unit suite pins that window with a frozen clock.
		secondMain.resetLocalCaches();

		for (const projectId of projectIds) {
			expect(await verdictOnSecondMain(projectId)).toBe('allow');
		}
	});
});
