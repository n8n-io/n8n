import type { OperationContext, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';

import type { TypeAvailabilityPolicyAttachmentRepository } from '../database/repositories/type-availability-policy-attachment.repository';
import type { TypeAvailabilityPolicyScopeRepository } from '../database/repositories/type-availability-policy-scope.repository';
import type { TypeAvailabilityPolicyRepository } from '../database/repositories/type-availability-policy.repository';
import { TypeAvailabilityPolicy } from '../database/entities/type-availability-policy.entity';
import { TypeAvailabilityPolicyScope } from '../database/entities/type-availability-policy-scope.entity';
import type { PolicyRule } from '../policy-rule.types';
import { TypeAvailabilityPolicyService } from '../type-availability-policy.service';

const KIND = 'node-types';
const ROOT: OperationContext = {};

const RULE: PolicyRule = {
	id: 'r1',
	action: 'deny',
	selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
};

const DELEGATE_RULE: PolicyRule = {
	id: 'r-delegate',
	action: 'delegate',
	selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
};

const DELEGATE_RULE_AT_PROJECT_SCOPE = 'A rule cannot use action "delegate" at project scope';

function makeScope(overrides: Partial<TypeAvailabilityPolicyScope> = {}) {
	return Object.assign(new TypeAvailabilityPolicyScope(), {
		id: 'scope-1',
		kind: KIND,
		projectId: null,
		defaultAction: 'allow',
		version: 1,
		updatedBy: 'user-1',
		...overrides,
	});
}

function makePolicy(overrides: Partial<TypeAvailabilityPolicy> = {}) {
	return Object.assign(new TypeAvailabilityPolicy(), {
		id: 'policy-1',
		kind: KIND,
		rules: [RULE],
		version: 1,
		updatedBy: 'user-1',
		...overrides,
	});
}

describe('TypeAvailabilityPolicyService', () => {
	const policyRepository = mock<TypeAvailabilityPolicyRepository>();
	const scopeRepository = mock<TypeAvailabilityPolicyScopeRepository>();
	const attachmentRepository = mock<TypeAvailabilityPolicyAttachmentRepository>();
	const transactionRunner = mock<TransactionRunner>();
	const eventService = mock<EventService>();

	const service = new TypeAvailabilityPolicyService(
		policyRepository,
		scopeRepository,
		attachmentRepository,
		transactionRunner,
		eventService,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ROOT));
	});

	describe('getEffectivePolicy', () => {
		it('reports allow-all at version 0 without creating a scope row', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);

			const result = await service.getEffectivePolicy(KIND, null);

			expect(result).toEqual({
				scopeId: null,
				kind: KIND,
				projectId: null,
				defaultAction: 'allow',
				version: 0,
				rules: [],
				attachments: [],
			});
			expect(scopeRepository.createScopeIfAbsent).not.toHaveBeenCalled();
			expect(attachmentRepository.listAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('flattens attachments in floor-then-priority order', async () => {
			const scope = makeScope({ defaultAction: 'deny', version: 3 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			const floorRule: PolicyRule = {
				id: 'floor',
				action: 'allow',
				selector: { kind: 'package', value: 'n8n-nodes-base' },
			};
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'normal', rules: [RULE], priority: 0, isFloor: false },
				{ policyId: 'floor', rules: [floorRule], priority: 0, isFloor: true },
			]);

			const result = await service.getEffectivePolicy(KIND, null);

			expect(result.rules).toEqual([floorRule, RULE]);
			expect(result.defaultAction).toBe('deny');
			expect(result.version).toBe(3);
		});
	});

	describe('setDefaultAction', () => {
		it('rejects a delegate defaultAction at project scope before opening a transaction', async () => {
			await expect(
				service.setDefaultAction(KIND, 'project-1', 'delegate', 0, 'user-1'),
			).rejects.toThrow('defaultAction cannot be "delegate" at project scope');

			expect(transactionRunner.run).not.toHaveBeenCalled();
			expect(scopeRepository.findScopeByKindAndProject).not.toHaveBeenCalled();
		});

		it('still allows a delegate defaultAction at instance scope', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			scopeRepository.createScopeIfAbsent.mockResolvedValue({
				scope: makeScope({ defaultAction: 'delegate', version: 1 }),
				created: true,
			});

			await expect(
				service.setDefaultAction(KIND, null, 'delegate', 0, 'user-1'),
			).resolves.not.toThrow();
		});

		it('throws ConflictError on a stale version and writes nothing', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(makeScope({ version: 2 }));

			await expect(service.setDefaultAction(KIND, null, 'deny', 1, 'user-2')).rejects.toThrow(
				ConflictError,
			);

			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(
				KIND,
				null,
				ROOT,
				true,
			);
			expect(scopeRepository.createScopeIfAbsent).not.toHaveBeenCalled();
			expect(scopeRepository.updateDefaultAction).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws ConflictError when a racing first write created the scope first', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			scopeRepository.createScopeIfAbsent.mockResolvedValue({
				scope: makeScope({ defaultAction: 'allow', version: 1 }),
				created: false,
			});

			await expect(service.setDefaultAction(KIND, null, 'deny', 0, 'user-2')).rejects.toThrow(
				ConflictError,
			);

			expect(scopeRepository.updateDefaultAction).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('lazily creates the scope on first write and emits once', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			const created = makeScope({ defaultAction: 'deny', version: 1 });
			scopeRepository.createScopeIfAbsent.mockResolvedValue({ scope: created, created: true });

			const result = await service.setDefaultAction(KIND, null, 'deny', 0, 'user-2');

			expect(result).toBe(created);
			expect(scopeRepository.createScopeIfAbsent).toHaveBeenCalledWith(
				{ kind: KIND, projectId: null, defaultAction: 'deny', updatedBy: 'user-2' },
				ROOT,
			);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-scope-updated', {
				updatedBy: 'user-2',
				kind: KIND,
				projectId: null,
				scopeId: created.id,
				before: null,
				after: { defaultAction: 'deny', version: 1 },
			});
		});

		it('updates an existing scope and emits before/after', async () => {
			const existing = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(existing);
			const updated = makeScope({ defaultAction: 'deny', version: 2 });
			scopeRepository.updateDefaultAction.mockResolvedValue(updated);

			await service.setDefaultAction(KIND, null, 'deny', 1, 'user-2');

			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-scope-updated', {
				updatedBy: 'user-2',
				kind: KIND,
				projectId: null,
				scopeId: updated.id,
				before: { defaultAction: 'allow', version: 1 },
				after: { defaultAction: 'deny', version: 2 },
			});
		});

		it('falls back to the pre-update scope when the update unexpectedly finds no row', async () => {
			const existing = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(existing);
			scopeRepository.updateDefaultAction.mockResolvedValue(null);

			const result = await service.setDefaultAction(KIND, null, 'deny', 1, 'user-2');

			expect(result).toBe(existing);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-scope-updated', {
				updatedBy: 'user-2',
				kind: KIND,
				projectId: null,
				scopeId: existing.id,
				before: { defaultAction: 'allow', version: 1 },
				after: { defaultAction: 'allow', version: 1 },
			});
		});
	});

	describe('createPolicyDocument', () => {
		it('creates the document and emits once', async () => {
			const created = makePolicy();
			policyRepository.createPolicy.mockResolvedValue(created);

			const { policy, warnings } = await service.createPolicyDocument(KIND, [RULE], 'user-1');

			expect(policy).toBe(created);
			expect(warnings).toEqual([]);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-document-created', {
				updatedBy: 'user-1',
				kind: KIND,
				policyId: created.id,
				after: { rules: created.rules, version: created.version },
			});
		});

		it('surfaces shadow-lint warnings without rejecting the write', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			const shadowed: PolicyRule = {
				id: 'r2',
				action: 'allow',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			};

			const { warnings } = await service.createPolicyDocument(KIND, [RULE, shadowed], 'user-1');

			expect(warnings).toEqual([{ ruleId: 'r2', shadowedByRuleId: 'r1' }]);
			expect(policyRepository.createPolicy).toHaveBeenCalled();
		});
	});

	describe('updatePolicyDocument', () => {
		beforeEach(() => {
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([]);
			scopeRepository.lockScopesByIds.mockResolvedValue([]);
			scopeRepository.containsProjectScope.mockResolvedValue(false);
		});

		it('rejects a delegate rule when the document is attached to a project scope, before reading it', async () => {
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);
			scopeRepository.containsProjectScope.mockResolvedValue(true);

			await expect(
				service.updatePolicyDocument('policy-1', [DELEGATE_RULE], 1, 'user-2'),
			).rejects.toThrow(DELEGATE_RULE_AT_PROJECT_SCOPE);

			expect(scopeRepository.containsProjectScope).toHaveBeenCalledWith(['scope-1'], ROOT);
			expect(policyRepository.findById).not.toHaveBeenCalled();
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('still accepts a delegate rule when the document is attached to instance scope only', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			policyRepository.findById.mockResolvedValue(before);
			policyRepository.updateRules.mockResolvedValue(
				makePolicy({ rules: [DELEGATE_RULE], version: 2 }),
			);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);
			scopeRepository.containsProjectScope.mockResolvedValue(false);

			await expect(
				service.updatePolicyDocument(before.id, [DELEGATE_RULE], 1, 'user-2'),
			).resolves.not.toThrow();

			expect(policyRepository.updateRules).toHaveBeenCalledWith(
				before.id,
				[DELEGATE_RULE],
				'user-2',
				ROOT,
			);
		});

		it('does not look up the scope kinds when the rules carry no delegate', async () => {
			policyRepository.findById.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
			policyRepository.updateRules.mockResolvedValue(makePolicy({ rules: [RULE], version: 2 }));
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

			await service.updatePolicyDocument('policy-1', [RULE], 1, 'user-2');

			expect(scopeRepository.containsProjectScope).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the document does not exist', async () => {
			policyRepository.findById.mockResolvedValue(null);

			await expect(service.updatePolicyDocument('missing', [RULE], 0, 'user-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
		});

		it('throws ConflictError on a stale version and writes nothing', async () => {
			policyRepository.findById.mockResolvedValue(makePolicy({ version: 2 }));

			await expect(service.updatePolicyDocument('policy-1', [RULE], 1, 'user-2')).rejects.toThrow(
				ConflictError,
			);

			expect(policyRepository.findById).toHaveBeenCalledWith('policy-1', ROOT, true);
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('locks the attached scopes before the document, then bumps them and emits once', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			policyRepository.findById.mockResolvedValue(before);
			const after = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue(after);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-2', 'scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1', 'scope-2']);

			await service.updatePolicyDocument(before.id, [RULE], 1, 'user-2');

			expect(scopeRepository.lockScopesByIds).toHaveBeenCalledWith(['scope-2', 'scope-1'], ROOT);
			expect(scopeRepository.lockScopesByIds.mock.invocationCallOrder[0]).toBeLessThan(
				policyRepository.findById.mock.invocationCallOrder[0],
			);
			expect(scopeRepository.bumpVersions).toHaveBeenCalledWith(['scope-1', 'scope-2'], ROOT);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-document-updated', {
				updatedBy: 'user-2',
				kind: KIND,
				policyId: before.id,
				before: { rules: [], version: 1 },
				after: { rules: [RULE], version: 2 },
			});
		});

		it('does not bump the attached scopes when the rules are unchanged', async () => {
			const unchanged = makePolicy({ rules: [RULE], version: 1 });
			policyRepository.findById.mockResolvedValue(unchanged);
			policyRepository.updateRules.mockResolvedValue(unchanged);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

			await service.updatePolicyDocument(unchanged.id, [RULE], 1, 'user-2');

			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledTimes(1);
		});

		it('throws NotFoundError when the update unexpectedly finds no row', async () => {
			policyRepository.findById.mockResolvedValue(makePolicy({ version: 1 }));
			policyRepository.updateRules.mockResolvedValue(null);

			await expect(service.updatePolicyDocument('policy-1', [RULE], 1, 'user-2')).rejects.toThrow(
				NotFoundError,
			);

			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws ConflictError when a scope was attached after the scopes were locked', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			policyRepository.findById.mockResolvedValue(before);
			policyRepository.updateRules.mockResolvedValue(makePolicy({ rules: [RULE], version: 2 }));
			attachmentRepository.listScopeIdsAttachedToPolicy
				.mockResolvedValueOnce(['scope-1'])
				.mockResolvedValueOnce(['scope-1', 'scope-2']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

			await expect(service.updatePolicyDocument(before.id, [RULE], 1, 'user-2')).rejects.toThrow(
				ConflictError,
			);

			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('deletePolicyDocument', () => {
		it('throws NotFoundError when the document does not exist', async () => {
			policyRepository.findById.mockResolvedValue(null);

			await expect(service.deletePolicyDocument('missing', 'user-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(attachmentRepository.listScopeIdsAttachedToPolicy).not.toHaveBeenCalled();
		});

		it('throws ConflictError when still attached, and never calls delete', async () => {
			const existing = makePolicy();
			policyRepository.findById.mockResolvedValue(existing);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1', 'scope-2']);

			await expect(service.deletePolicyDocument(existing.id, 'user-1')).rejects.toThrow(
				ConflictError,
			);
			expect(policyRepository.deletePolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('deletes and emits once when detached', async () => {
			const existing = makePolicy();
			policyRepository.findById.mockResolvedValue(existing);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([]);

			await service.deletePolicyDocument(existing.id, 'user-1');

			expect(policyRepository.findById).toHaveBeenCalledWith(existing.id, ROOT, true);
			expect(policyRepository.deletePolicy).toHaveBeenCalledWith(existing.id, ROOT);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-document-deleted', {
				updatedBy: 'user-1',
				kind: KIND,
				policyId: existing.id,
				before: { rules: existing.rules, version: existing.version },
			});
		});
	});

	describe('replaceAttachments', () => {
		it('rejects a duplicate policyId before any repository call', async () => {
			await expect(
				service.replaceAttachments(
					'scope-1',
					[
						{ policyId: 'p1', priority: 0, isFloor: false },
						{ policyId: 'p1', priority: 1, isFloor: false },
					],
					'user-1',
				),
			).rejects.toThrow('Duplicate policyId');

			expect(scopeRepository.findScopeById).not.toHaveBeenCalled();
			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('rejects a duplicate (isFloor, priority) pair before any repository call', async () => {
			await expect(
				service.replaceAttachments(
					'scope-1',
					[
						{ policyId: 'p1', priority: 0, isFloor: false },
						{ policyId: 'p2', priority: 0, isFloor: false },
					],
					'user-1',
				),
			).rejects.toThrow('Duplicate (isFloor, priority)');

			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the scope does not exist', async () => {
			scopeRepository.findScopeById.mockResolvedValue(null);

			await expect(
				service.replaceAttachments(
					'missing',
					[{ policyId: 'p1', priority: 0, isFloor: false }],
					'user-1',
				),
			).rejects.toThrow(NotFoundError);
		});

		it('replaces attachments, bumps the version, and emits once', async () => {
			const scope = makeScope({ version: 1 });
			scopeRepository.findScopeById
				.mockResolvedValueOnce(scope)
				.mockResolvedValueOnce(makeScope({ version: 2 }));
			attachmentRepository.listAttachmentsForScope
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ policyId: 'p1', rules: [RULE], priority: 0, isFloor: false }]);

			const result = await service.replaceAttachments(
				scope.id,
				[{ policyId: 'p1', priority: 0, isFloor: false }],
				'user-1',
			);

			expect(scopeRepository.findScopeById).toHaveBeenNthCalledWith(1, scope.id, ROOT, true);
			expect(attachmentRepository.replaceAttachmentsForScope).toHaveBeenCalledWith(
				scope.id,
				[{ policyId: 'p1', priority: 0, isFloor: false }],
				ROOT,
			);
			expect(scopeRepository.bumpVersion).toHaveBeenCalledWith(scope.id, ROOT);
			expect(result.version).toBe(2);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-attachments-updated', {
				updatedBy: 'user-1',
				kind: KIND,
				projectId: null,
				scopeId: scope.id,
				before: { attachments: [], version: 1 },
				after: {
					attachments: [{ policyId: 'p1', rules: [RULE], priority: 0, isFloor: false }],
					version: 2,
				},
			});
		});

		it('falls back to computing the version when the re-read finds no row', async () => {
			const scope = makeScope({ version: 1 });
			scopeRepository.findScopeById.mockResolvedValueOnce(scope).mockResolvedValueOnce(null);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

			const result = await service.replaceAttachments(
				scope.id,
				[{ policyId: 'p1', priority: 0, isFloor: false }],
				'user-1',
			);

			expect(result.version).toBe(2);
		});

		it('rejects attaching a document with a delegate rule to a project scope, and writes nothing', async () => {
			scopeRepository.findScopeById.mockResolvedValue(makeScope({ projectId: 'project-1' }));
			policyRepository.findManyByIds.mockResolvedValue([
				makePolicy({ id: 'p1', rules: [RULE] }),
				makePolicy({ id: 'p2', rules: [DELEGATE_RULE] }),
			]);

			await expect(
				service.replaceAttachments(
					'scope-1',
					[
						{ policyId: 'p1', priority: 0, isFloor: false },
						{ policyId: 'p2', priority: 1, isFloor: false },
					],
					'user-1',
				),
			).rejects.toThrow(DELEGATE_RULE_AT_PROJECT_SCOPE);

			// Locked read: the check must hold against a concurrent document edit.
			expect(policyRepository.findManyByIds).toHaveBeenCalledWith(['p1', 'p2'], ROOT, true);
			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('does not inspect the documents when attaching to instance scope', async () => {
			scopeRepository.findScopeById.mockResolvedValue(makeScope({ projectId: null }));
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

			await service.replaceAttachments(
				'scope-1',
				[{ policyId: 'p-delegating', priority: 0, isFloor: false }],
				'user-1',
			);

			expect(policyRepository.findManyByIds).not.toHaveBeenCalled();
			expect(attachmentRepository.replaceAttachmentsForScope).toHaveBeenCalled();
		});
	});

	describe('setEffectivePolicy', () => {
		beforeEach(() => {
			// By default a scope's document is attached to that scope alone.
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
		});

		it('throws ConflictError when the scope has several attached documents, and writes nothing', async () => {
			const scope = makeScope({ projectId: 'project-1', defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
				{ policyId: 'policy-2', rules: [], priority: 1, isFloor: false },
			]);

			await expect(
				service.setEffectivePolicy(
					KIND,
					'project-1',
					{ rules: [RULE], defaultAction: 'deny' },
					1,
					'user-2',
				),
			).rejects.toThrow(ConflictError);

			expect(scopeRepository.updateDefaultAction).not.toHaveBeenCalled();
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws ConflictError when the attached document is shared with another scope, and writes nothing', async () => {
			const scope = makeScope({ projectId: 'project-1', defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
			]);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([
				scope.id,
				'instance-scope',
			]);

			await expect(
				service.setEffectivePolicy(
					KIND,
					'project-1',
					{ rules: [RULE], defaultAction: 'deny' },
					1,
					'user-2',
				),
			).rejects.toThrow(ConflictError);

			expect(attachmentRepository.listScopeIdsAttachedToPolicy).toHaveBeenCalledWith(
				'policy-1',
				ROOT,
			);
			expect(scopeRepository.updateDefaultAction).not.toHaveBeenCalled();
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('locks the existing document before checking which scopes use it', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
			]);
			policyRepository.findById.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
			policyRepository.updateRules.mockResolvedValue(makePolicy({ rules: [RULE], version: 2 }));
			scopeRepository.findScopeById.mockResolvedValue(makeScope({ version: 2 }));

			await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'allow' },
				1,
				'user-2',
			);

			expect(policyRepository.findById).toHaveBeenCalledWith('policy-1', ROOT, true);
			expect(policyRepository.findById.mock.invocationCallOrder[0]).toBeLessThan(
				attachmentRepository.listScopeIdsAttachedToPolicy.mock.invocationCallOrder[0],
			);
		});

		it('rejects a delegate defaultAction at project scope before opening a transaction', async () => {
			await expect(
				service.setEffectivePolicy(
					KIND,
					'project-1',
					{ rules: [], defaultAction: 'delegate' },
					0,
					'user-1',
				),
			).rejects.toThrow('defaultAction cannot be "delegate" at project scope');

			expect(transactionRunner.run).not.toHaveBeenCalled();
		});

		it('rejects a delegate rule action at project scope before opening a transaction', async () => {
			const delegateRule: PolicyRule = {
				id: 'r1',
				action: 'delegate',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			};

			await expect(
				service.setEffectivePolicy(
					KIND,
					'project-1',
					{ rules: [delegateRule], defaultAction: 'allow' },
					0,
					'user-1',
				),
			).rejects.toThrow('A rule cannot use action "delegate" at project scope');

			expect(transactionRunner.run).not.toHaveBeenCalled();
		});

		it('still allows delegate at instance scope', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			scopeRepository.createScopeIfAbsent.mockResolvedValue({
				scope: makeScope({ defaultAction: 'delegate', version: 1 }),
				created: true,
			});
			policyRepository.createPolicy.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
			scopeRepository.findScopeById.mockResolvedValue(
				makeScope({ defaultAction: 'delegate', version: 2 }),
			);

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [], defaultAction: 'delegate' },
					0,
					'user-1',
				),
			).resolves.not.toThrow();
		});

		it('throws ConflictError on a stale version and writes nothing', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(makeScope({ version: 2 }));

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [RULE], defaultAction: 'deny' },
					1,
					'user-1',
				),
			).rejects.toThrow(ConflictError);

			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(
				KIND,
				null,
				ROOT,
				true,
			);
			expect(scopeRepository.createScopeIfAbsent).not.toHaveBeenCalled();
			expect(policyRepository.createPolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws ConflictError when a racing first write created the scope first', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			scopeRepository.createScopeIfAbsent.mockResolvedValue({
				scope: makeScope({ version: 2 }),
				created: false,
			});

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [RULE], defaultAction: 'deny' },
					0,
					'user-1',
				),
			).rejects.toThrow(ConflictError);

			expect(policyRepository.createPolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('creates the scope and its first document on first write', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			const createdScope = makeScope({ defaultAction: 'deny', version: 1 });
			scopeRepository.createScopeIfAbsent.mockResolvedValue({
				scope: createdScope,
				created: true,
			});
			const createdPolicy = makePolicy({ rules: [RULE], version: 1 });
			policyRepository.createPolicy.mockResolvedValue(createdPolicy);
			scopeRepository.findScopeById.mockResolvedValue(
				makeScope({ defaultAction: 'deny', version: 2 }),
			);

			const result = await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'deny' },
				0,
				'user-1',
			);

			expect(result.version).toBe(2);
			expect(result.rules).toEqual([RULE]);
			expect(attachmentRepository.replaceAttachmentsForScope).toHaveBeenCalledWith(
				createdScope.id,
				[{ policyId: createdPolicy.id, priority: 0, isFloor: false }],
				ROOT,
			);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-scope-updated',
				expect.objectContaining({ before: null }),
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-document-created',
				expect.objectContaining({ policyId: createdPolicy.id }),
			);
		});

		it('updates the existing scope and document, emitting both facets', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			const existingPolicy = makePolicy({ rules: [], version: 1 });
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: existingPolicy.id, rules: [], priority: 0, isFloor: false },
			]);
			policyRepository.findById.mockResolvedValue(existingPolicy);
			const updatedPolicy = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue(updatedPolicy);
			scopeRepository.findScopeById.mockResolvedValue(
				makeScope({ defaultAction: 'deny', version: 3 }),
			);

			await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'deny' },
				1,
				'user-2',
			);

			expect(scopeRepository.updateDefaultAction).toHaveBeenCalledWith(
				scope.id,
				'deny',
				'user-2',
				ROOT,
			);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-document-updated',
				expect.objectContaining({
					before: { rules: [], version: 1 },
					after: { rules: [RULE], version: 2 },
				}),
			);
		});

		it('throws NotFoundError when the document update unexpectedly finds no row', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
			]);
			policyRepository.findById.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
			policyRepository.updateRules.mockResolvedValue(null);

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [RULE], defaultAction: 'allow' },
					1,
					'user-2',
				),
			).rejects.toThrow(NotFoundError);
		});

		it('reports no prior document when the existing document is unexpectedly missing', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
			]);
			policyRepository.findById.mockResolvedValue(null);
			const updatedPolicy = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue(updatedPolicy);
			scopeRepository.findScopeById.mockResolvedValue(
				makeScope({ defaultAction: 'allow', version: 2 }),
			);

			await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'allow' },
				1,
				'user-2',
			);

			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-document-updated',
				expect.objectContaining({
					before: { rules: [], version: 0 },
					after: { rules: [RULE], version: 2 },
				}),
			);
		});

		it('falls back to computing the scope-after when the final read finds no row', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			scopeRepository.createScopeIfAbsent.mockResolvedValue({
				scope: makeScope({ defaultAction: 'deny', version: 1 }),
				created: true,
			});
			policyRepository.createPolicy.mockResolvedValue(makePolicy({ rules: [RULE], version: 1 }));
			scopeRepository.findScopeById.mockResolvedValue(null);

			const result = await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'deny' },
				0,
				'user-1',
			);

			expect(result.defaultAction).toBe('deny');
			expect(result.version).toBe(1);
		});
	});

	describe('evaluateComposedType', () => {
		const PROJECT_ID = 'project-1';
		const TYPE = 'n8n-nodes-base.slack';

		it('reads the instance and project scopes and composes their verdicts', async () => {
			const instanceScope = makeScope({ projectId: null, defaultAction: 'delegate', version: 1 });
			const projectScope = makeScope({
				id: 'scope-2',
				projectId: PROJECT_ID,
				defaultAction: 'deny',
				version: 1,
			});
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				projectId === null ? instanceScope : projectScope,
			);
			const projectAllowRule: PolicyRule = {
				id: 'project-allow',
				action: 'allow',
				selector: { kind: 'name', value: TYPE },
			};
			attachmentRepository.listAttachmentsForScope.mockImplementation(async (scopeId) =>
				scopeId === projectScope.id
					? [{ policyId: 'p1', rules: [projectAllowRule], priority: 0, isFloor: false }]
					: [],
			);

			const result = await service.evaluateComposedType(KIND, PROJECT_ID, TYPE);

			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(KIND, null, ROOT);
			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(
				KIND,
				PROJECT_ID,
				ROOT,
			);
			expect(result).toEqual({
				action: 'allow',
				scope: 'project',
				matchedRuleId: 'project-allow',
				optInAvailable: false,
			});
		});

		it('lets an instance deny win over an unconfigured project', async () => {
			const denyRule: PolicyRule = {
				id: 'instance-deny',
				action: 'deny',
				selector: { kind: 'name', value: TYPE },
			};
			const instanceScope = makeScope({ projectId: null, defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				projectId === null ? instanceScope : null,
			);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'p1', rules: [denyRule], priority: 0, isFloor: false },
			]);

			const result = await service.evaluateComposedType(KIND, PROJECT_ID, TYPE);

			expect(result).toEqual({
				action: 'deny',
				scope: 'instance',
				matchedRuleId: 'instance-deny',
				optInAvailable: false,
			});
		});
	});

	describe('evaluateComposedTypes', () => {
		const PROJECT_ID = 'project-1';

		it('reads each scope once and composes a verdict for every type', async () => {
			const instanceDeny: PolicyRule = {
				id: 'instance-deny',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.executeCommand' },
			};
			const instanceDelegate: PolicyRule = {
				id: 'instance-delegate',
				action: 'delegate',
				selector: { kind: 'name', value: 'n8n-nodes-base.code' },
			};
			const projectDeny: PolicyRule = {
				id: 'project-deny',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			};
			const instanceScope = makeScope({ projectId: null, defaultAction: 'allow' });
			const projectScope = makeScope({
				id: 'scope-2',
				projectId: PROJECT_ID,
				defaultAction: 'allow',
			});
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				projectId === null ? instanceScope : projectScope,
			);
			attachmentRepository.listAttachmentsForScope.mockImplementation(async (scopeId) => [
				{
					policyId: 'p1',
					rules: scopeId === projectScope.id ? [projectDeny] : [instanceDeny, instanceDelegate],
					priority: 0,
					isFloor: false,
				},
			]);

			const result = await service.evaluateComposedTypes(KIND, PROJECT_ID, [
				'n8n-nodes-base.gmail',
				'n8n-nodes-base.executeCommand',
				'n8n-nodes-base.code',
				'n8n-nodes-base.slack',
			]);

			expect(result).toEqual([
				{
					name: 'n8n-nodes-base.gmail',
					action: 'allow',
					scope: 'instance',
					matchedRuleId: null,
					optInAvailable: false,
				},
				{
					name: 'n8n-nodes-base.executeCommand',
					action: 'deny',
					scope: 'instance',
					matchedRuleId: 'instance-deny',
					optInAvailable: false,
				},
				{
					name: 'n8n-nodes-base.code',
					action: 'deny',
					scope: 'instance',
					matchedRuleId: 'instance-delegate',
					optInAvailable: true,
				},
				{
					name: 'n8n-nodes-base.slack',
					action: 'deny',
					scope: 'project',
					matchedRuleId: 'project-deny',
					optInAvailable: false,
				},
			]);
			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledTimes(2);
			expect(attachmentRepository.listAttachmentsForScope).toHaveBeenCalledTimes(2);
		});

		it('returns an empty list when there are no types', async () => {
			const result = await service.evaluateComposedTypes(KIND, PROJECT_ID, []);

			expect(result).toEqual([]);
		});
	});
});
