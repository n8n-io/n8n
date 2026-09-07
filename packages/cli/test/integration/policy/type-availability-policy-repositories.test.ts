import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';

import { TypeAvailabilityPolicyAttachmentRepository } from '@/modules/type-availability-policies.ee/database/repositories/type-availability-policy-attachment.repository';
import { TypeAvailabilityPolicyScopeRepository } from '@/modules/type-availability-policies.ee/database/repositories/type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from '@/modules/type-availability-policies.ee/database/repositories/type-availability-policy.repository';
import type { PolicyRule } from '@/modules/type-availability-policies.ee/policy-rule.types';

const KIND = 'node-types';

/** A non-transactional caller passes the root context. */
const ROOT: OperationContext = {};

const DENY_SLACK: PolicyRule = {
	id: 'rule-1',
	action: 'deny',
	selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
};

const ALLOW_BASE: PolicyRule = {
	id: 'rule-2',
	action: 'allow',
	selector: { kind: 'package', value: 'n8n-nodes-base' },
};

describe('type availability policy repositories', () => {
	let policyRepo: TypeAvailabilityPolicyRepository;
	let scopeRepo: TypeAvailabilityPolicyScopeRepository;
	let attachmentRepo: TypeAvailabilityPolicyAttachmentRepository;
	let transactionRunner: TransactionRunner;

	beforeAll(async () => {
		await testModules.loadModules(['type-availability-policies']);
		await testDb.init();
		policyRepo = Container.get(TypeAvailabilityPolicyRepository);
		scopeRepo = Container.get(TypeAvailabilityPolicyScopeRepository);
		attachmentRepo = Container.get(TypeAvailabilityPolicyAttachmentRepository);
		transactionRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'TypeAvailabilityPolicyAttachment',
			'TypeAvailabilityPolicyScope',
			'TypeAvailabilityPolicy',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createPolicy(rules: PolicyRule[] = [DENY_SLACK]) {
		return await policyRepo.createPolicy({ kind: KIND, rules, updatedBy: 'user-1' }, ROOT);
	}

	async function createInstanceScope() {
		return await scopeRepo.createScope(
			{ kind: KIND, projectId: null, defaultAction: 'allow', updatedBy: 'user-1' },
			ROOT,
		);
	}

	describe('TypeAvailabilityPolicyRepository', () => {
		it('creates a policy with a generated id at version 1', async () => {
			const policy = await createPolicy();

			expect(policy.id).toEqual(expect.any(String));
			expect(policy.version).toBe(1);
			expect(await policyRepo.findById(policy.id, ROOT)).toMatchObject({ rules: [DENY_SLACK] });
		});

		it('round-trips the rules document', async () => {
			const policy = await createPolicy([DENY_SLACK, ALLOW_BASE]);

			const stored = await policyRepo.findById(policy.id, ROOT);

			expect(stored?.rules).toEqual([DENY_SLACK, ALLOW_BASE]);
		});

		it('bumps the version when the rules change', async () => {
			const policy = await createPolicy();

			const updated = await policyRepo.updateRules(policy.id, [ALLOW_BASE], 'user-2', ROOT);

			expect(updated?.version).toBe(2);
			expect(updated?.rules).toEqual([ALLOW_BASE]);
			expect(updated?.updatedBy).toBe('user-2');
		});

		it('leaves the version alone when the rules are unchanged', async () => {
			const policy = await createPolicy([DENY_SLACK, ALLOW_BASE]);

			const updated = await policyRepo.updateRules(
				policy.id,
				[DENY_SLACK, ALLOW_BASE],
				'user-2',
				ROOT,
			);

			expect(updated?.version).toBe(1);
			expect(updated?.updatedBy).toBe('user-1');
		});

		it('treats reordered rules as a change, since order decides first match', async () => {
			const policy = await createPolicy([DENY_SLACK, ALLOW_BASE]);

			const updated = await policyRepo.updateRules(
				policy.id,
				[ALLOW_BASE, DENY_SLACK],
				'user-2',
				ROOT,
			);

			expect(updated?.version).toBe(2);
		});

		// Sequential only — the overlapping case is covered by the unit test on the
		// repository, since neither database lets this suite interleave two writers.
		it('bumps the version once per change, and round-trips the rules each time', async () => {
			const policy = await createPolicy([DENY_SLACK]);

			await policyRepo.updateRules(policy.id, [ALLOW_BASE], 'user-2', ROOT);
			await policyRepo.updateRules(policy.id, [DENY_SLACK], 'user-3', ROOT);
			const third = await policyRepo.updateRules(policy.id, [ALLOW_BASE, DENY_SLACK], 'u', ROOT);

			expect(third?.version).toBe(4);
			expect(third?.rules).toEqual([ALLOW_BASE, DENY_SLACK]);
		});

		it('treats a differently-ordered rule object as unchanged', async () => {
			const policy = await createPolicy([DENY_SLACK]);
			// Same rule, keys serialised in another order — as a client or an env
			// config could plausibly send it.
			const reordered = {
				selector: { value: 'n8n-nodes-base.slack', kind: 'name' },
				action: 'deny',
				id: 'rule-1',
			} as unknown as PolicyRule;

			const updated = await policyRepo.updateRules(policy.id, [reordered], 'user-2', ROOT);

			expect(updated?.version).toBe(1);
			expect(updated?.updatedBy).toBe('user-1');
		});

		it('returns null when updating a policy that does not exist', async () => {
			expect(await policyRepo.updateRules('missing', [ALLOW_BASE], 'user-1', ROOT)).toBeNull();
		});

		it('finds many by id and ignores unknown ids', async () => {
			const a = await createPolicy();
			const b = await createPolicy([ALLOW_BASE]);

			const found = await policyRepo.findManyByIds([a.id, b.id, 'missing'], ROOT);

			expect(found.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
		});

		it('refuses to delete a policy that is still attached', async () => {
			const policy = await createPolicy();
			const scope = await createInstanceScope();
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				ROOT,
			);

			await expect(policyRepo.deletePolicy(policy.id, ROOT)).rejects.toThrow();
			expect(await policyRepo.findById(policy.id, ROOT)).not.toBeNull();
		});

		it('deletes a policy once it is detached', async () => {
			const policy = await createPolicy();
			const scope = await createInstanceScope();
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				ROOT,
			);

			await attachmentRepo.replaceAttachmentsForScope(scope.id, [], ROOT);
			await policyRepo.deletePolicy(policy.id, ROOT);

			expect(await policyRepo.findById(policy.id, ROOT)).toBeNull();
		});
	});

	describe('TypeAvailabilityPolicyScopeRepository', () => {
		it('finds the instance scope by a null projectId', async () => {
			const scope = await createInstanceScope();

			const found = await scopeRepo.findScopeByKindAndProject(KIND, null, ROOT);

			expect(found?.id).toBe(scope.id);
			expect(found?.projectId).toBeNull();
		});

		it('does not confuse a project scope with the instance scope', async () => {
			const project = await createTeamProject();
			await createInstanceScope();
			const projectScope = await scopeRepo.createScope(
				{ kind: KIND, projectId: project.id, defaultAction: 'deny', updatedBy: 'user-1' },
				ROOT,
			);

			const found = await scopeRepo.findScopeByKindAndProject(KIND, project.id, ROOT);

			expect(found?.id).toBe(projectScope.id);
			expect(found?.defaultAction).toBe('deny');
		});

		it('rejects a second instance scope for the same kind', async () => {
			await createInstanceScope();

			await expect(createInstanceScope()).rejects.toThrow();
		});

		it('bumps the version when the default action changes', async () => {
			const scope = await createInstanceScope();

			const updated = await scopeRepo.updateDefaultAction(scope.id, 'deny', 'user-2', ROOT);

			expect(updated?.version).toBe(2);
			expect(updated?.defaultAction).toBe('deny');
		});

		it('leaves the version alone when the default action is unchanged', async () => {
			const scope = await createInstanceScope();

			const updated = await scopeRepo.updateDefaultAction(scope.id, 'allow', 'user-2', ROOT);

			expect(updated?.version).toBe(1);
		});

		it('bumps many versions at once', async () => {
			const project = await createTeamProject();
			const instanceScope = await createInstanceScope();
			const projectScope = await scopeRepo.createScope(
				{ kind: KIND, projectId: project.id, defaultAction: 'allow', updatedBy: 'user-1' },
				ROOT,
			);

			await scopeRepo.bumpVersions([instanceScope.id, projectScope.id], ROOT);

			expect((await scopeRepo.findScopeById(instanceScope.id, ROOT))?.version).toBe(2);
			expect((await scopeRepo.findScopeById(projectScope.id, ROOT))?.version).toBe(2);
		});
	});

	describe('TypeAvailabilityPolicyAttachmentRepository', () => {
		it('returns attachments with their policy rules resolved', async () => {
			const scope = await createInstanceScope();
			const floor = await createPolicy([DENY_SLACK]);
			const normal = await createPolicy([ALLOW_BASE]);
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[
					{ policyId: normal.id, priority: 0, isFloor: false },
					{ policyId: floor.id, priority: 0, isFloor: true },
				],
				ROOT,
			);

			const attachments = await attachmentRepo.listAttachmentsForScope(scope.id, ROOT);

			expect(attachments).toHaveLength(2);
			expect(attachments).toContainEqual({
				policyId: floor.id,
				rules: [DENY_SLACK],
				priority: 0,
				isFloor: true,
			});
			expect(attachments).toContainEqual({
				policyId: normal.id,
				rules: [ALLOW_BASE],
				priority: 0,
				isFloor: false,
			});
		});

		it('replaces the whole list rather than appending', async () => {
			const scope = await createInstanceScope();
			const first = await createPolicy();
			const second = await createPolicy([ALLOW_BASE]);
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[{ policyId: first.id, priority: 0, isFloor: false }],
				ROOT,
			);

			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[{ policyId: second.id, priority: 0, isFloor: false }],
				ROOT,
			);

			const attachments = await attachmentRepo.listAttachmentsForScope(scope.id, ROOT);
			expect(attachments.map((a) => a.policyId)).toEqual([second.id]);
		});

		it('reorders by replacing with new priorities, without a transient collision', async () => {
			const scope = await createInstanceScope();
			const a = await createPolicy();
			const b = await createPolicy([ALLOW_BASE]);
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[
					{ policyId: a.id, priority: 0, isFloor: false },
					{ policyId: b.id, priority: 1, isFloor: false },
				],
				ROOT,
			);

			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[
					{ policyId: a.id, priority: 1, isFloor: false },
					{ policyId: b.id, priority: 0, isFloor: false },
				],
				ROOT,
			);

			const attachments = await attachmentRepo.listAttachmentsForScope(scope.id, ROOT);
			const byPolicy = new Map(attachments.map((at) => [at.policyId, at.priority]));
			expect(byPolicy.get(a.id)).toBe(1);
			expect(byPolicy.get(b.id)).toBe(0);
		});

		it('rejects a list that reuses a priority within one partition', async () => {
			const scope = await createInstanceScope();
			const a = await createPolicy();
			const b = await createPolicy([ALLOW_BASE]);

			await expect(
				attachmentRepo.replaceAttachmentsForScope(
					scope.id,
					[
						{ policyId: a.id, priority: 0, isFloor: false },
						{ policyId: b.id, priority: 0, isFloor: false },
					],
					ROOT,
				),
			).rejects.toThrow();
		});

		it('admits the same priority across the floor and normal partitions', async () => {
			const scope = await createInstanceScope();
			const a = await createPolicy();
			const b = await createPolicy([ALLOW_BASE]);

			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[
					{ policyId: a.id, priority: 0, isFloor: true },
					{ policyId: b.id, priority: 0, isFloor: false },
				],
				ROOT,
			);

			expect(await attachmentRepo.listAttachmentsForScope(scope.id, ROOT)).toHaveLength(2);
		});

		it('rejects a policy whose kind differs from the scope', async () => {
			const scope = await createInstanceScope();
			const otherKind = await policyRepo.createPolicy(
				{ kind: 'credential-types', rules: [DENY_SLACK], updatedBy: 'user-1' },
				ROOT,
			);

			await expect(
				attachmentRepo.replaceAttachmentsForScope(
					scope.id,
					[{ policyId: otherKind.id, priority: 0, isFloor: false }],
					ROOT,
				),
			).rejects.toThrow('Cannot attach a "credential-types" policy to a "node-types" scope');
		});

		it('leaves the existing attachments untouched when the new list is rejected', async () => {
			const scope = await createInstanceScope();
			const good = await createPolicy();
			const otherKind = await policyRepo.createPolicy(
				{ kind: 'credential-types', rules: [DENY_SLACK], updatedBy: 'user-1' },
				ROOT,
			);
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[{ policyId: good.id, priority: 0, isFloor: false }],
				ROOT,
			);

			await expect(
				attachmentRepo.replaceAttachmentsForScope(
					scope.id,
					[{ policyId: otherKind.id, priority: 0, isFloor: false }],
					ROOT,
				),
			).rejects.toThrow();

			const attachments = await attachmentRepo.listAttachmentsForScope(scope.id, ROOT);
			expect(attachments.map((a) => a.policyId)).toEqual([good.id]);
		});

		it('reports an unknown policy rather than an opaque constraint error', async () => {
			const scope = await createInstanceScope();

			await expect(
				attachmentRepo.replaceAttachmentsForScope(
					scope.id,
					[{ policyId: 'does-not-exist', priority: 0, isFloor: false }],
					ROOT,
				),
			).rejects.toThrow('Cannot attach an unknown policy');
		});

		it('reports an unknown scope', async () => {
			const policy = await createPolicy();

			await expect(
				attachmentRepo.replaceAttachmentsForScope(
					'does-not-exist',
					[{ policyId: policy.id, priority: 0, isFloor: false }],
					ROOT,
				),
			).rejects.toThrow('Cannot attach policies to an unknown scope');
		});

		it('reports an unknown scope even when the new list is empty', async () => {
			await expect(
				attachmentRepo.replaceAttachmentsForScope('does-not-exist', [], ROOT),
			).rejects.toThrow('Cannot attach policies to an unknown scope');
		});

		it('clears the attachments of a scope that does exist', async () => {
			const scope = await createInstanceScope();
			const policy = await createPolicy();
			await attachmentRepo.replaceAttachmentsForScope(
				scope.id,
				[{ policyId: policy.id, priority: 0, isFloor: false }],
				ROOT,
			);

			await attachmentRepo.replaceAttachmentsForScope(scope.id, [], ROOT);

			expect(await attachmentRepo.listAttachmentsForScope(scope.id, ROOT)).toEqual([]);
		});

		it('lists every scope a policy is attached to', async () => {
			const project = await createTeamProject();
			const policy = await createPolicy();
			const instanceScope = await createInstanceScope();
			const projectScope = await scopeRepo.createScope(
				{ kind: KIND, projectId: project.id, defaultAction: 'allow', updatedBy: 'user-1' },
				ROOT,
			);
			for (const scopeId of [instanceScope.id, projectScope.id]) {
				await attachmentRepo.replaceAttachmentsForScope(
					scopeId,
					[{ policyId: policy.id, priority: 0, isFloor: false }],
					ROOT,
				);
			}

			const scopeIds = await attachmentRepo.listScopeIdsAttachedToPolicy(policy.id, ROOT);

			expect(scopeIds.sort()).toEqual([instanceScope.id, projectScope.id].sort());
		});
	});

	describe('transactional writes', () => {
		it('commits an attachment change and its version bump together', async () => {
			const scope = await createInstanceScope();
			const policy = await createPolicy();

			await transactionRunner.run({}, async (ctx) => {
				await attachmentRepo.replaceAttachmentsForScope(
					scope.id,
					[{ policyId: policy.id, priority: 0, isFloor: false }],
					ctx,
				);
				await scopeRepo.bumpVersion(scope.id, ctx);
			});

			expect(await attachmentRepo.listAttachmentsForScope(scope.id, ROOT)).toHaveLength(1);
			expect((await scopeRepo.findScopeById(scope.id, ROOT))?.version).toBe(2);
		});

		it('rolls both back when the unit of work fails', async () => {
			const scope = await createInstanceScope();
			const policy = await createPolicy();

			await expect(
				transactionRunner.run({}, async (ctx) => {
					await attachmentRepo.replaceAttachmentsForScope(
						scope.id,
						[{ policyId: policy.id, priority: 0, isFloor: false }],
						ctx,
					);
					await scopeRepo.bumpVersion(scope.id, ctx);
					throw new Error('fan-out failed');
				}),
			).rejects.toThrow('fan-out failed');

			expect(await attachmentRepo.listAttachmentsForScope(scope.id, ROOT)).toHaveLength(0);
			expect((await scopeRepo.findScopeById(scope.id, ROOT))?.version).toBe(1);
		});
	});
});
