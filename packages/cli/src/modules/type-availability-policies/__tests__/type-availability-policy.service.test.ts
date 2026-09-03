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
			expect(scopeRepository.createScope).not.toHaveBeenCalled();
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
		it('throws ConflictError on a stale version and writes nothing', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(makeScope({ version: 2 }));

			await expect(service.setDefaultAction(KIND, null, 'deny', 1, 'user-2')).rejects.toThrow(
				ConflictError,
			);

			expect(scopeRepository.createScope).not.toHaveBeenCalled();
			expect(scopeRepository.updateDefaultAction).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('lazily creates the scope on first write and emits once', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
			const created = makeScope({ defaultAction: 'deny', version: 1 });
			scopeRepository.createScope.mockResolvedValue(created);

			const result = await service.setDefaultAction(KIND, null, 'deny', 0, 'user-2');

			expect(result).toBe(created);
			expect(scopeRepository.createScope).toHaveBeenCalledWith(
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
		it('throws NotFoundError when the document does not exist', async () => {
			policyRepository.updateRules.mockResolvedValue(null);

			await expect(service.updatePolicyDocument('missing', [RULE], 'user-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(attachmentRepository.listScopeIdsAttachedToPolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('emits once with before/after rules and version', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			const after = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue({ before, after });
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([]);

			await service.updatePolicyDocument(before.id, [RULE], 'user-2');

			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-document-updated', {
				updatedBy: 'user-2',
				kind: KIND,
				policyId: before.id,
				before: { rules: [], version: 1 },
				after: { rules: [RULE], version: 2 },
			});
		});

		it('fans the version bump out to every scope the policy is attached to, on a real change', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			const after = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue({ before, after });
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1', 'scope-2']);

			await service.updatePolicyDocument(before.id, [RULE], 'user-2');

			expect(scopeRepository.bumpVersions).toHaveBeenCalledWith(['scope-1', 'scope-2'], ROOT);
		});

		it('does not fan out a version bump when the write is a content no-op', async () => {
			const unchanged = makePolicy({ rules: [RULE], version: 1 });
			policyRepository.updateRules.mockResolvedValue({ before: unchanged, after: unchanged });

			await service.updatePolicyDocument(unchanged.id, [RULE], 'user-2');

			expect(attachmentRepository.listScopeIdsAttachedToPolicy).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
		});
	});

	describe('deletePolicyDocument', () => {
		it('throws NotFoundError when the document does not exist', async () => {
			policyRepository.findByIdForUpdate.mockResolvedValue(null);

			await expect(service.deletePolicyDocument('missing', 'user-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(attachmentRepository.listScopeIdsAttachedToPolicy).not.toHaveBeenCalled();
		});

		it('throws ConflictError when still attached, and never calls delete', async () => {
			const existing = makePolicy();
			policyRepository.findByIdForUpdate.mockResolvedValue(existing);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1', 'scope-2']);

			await expect(service.deletePolicyDocument(existing.id, 'user-1')).rejects.toThrow(
				ConflictError,
			);
			expect(policyRepository.deletePolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('deletes and emits once when detached', async () => {
			const existing = makePolicy();
			policyRepository.findByIdForUpdate.mockResolvedValue(existing);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([]);

			await service.deletePolicyDocument(existing.id, 'user-1');

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
	});

	describe('setEffectivePolicy', () => {
		it('throws ConflictError on a stale version and writes nothing', async () => {
			scopeRepository.findScopeByKindAndProjectForUpdate.mockResolvedValue(
				makeScope({ version: 2 }),
			);

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [RULE], defaultAction: 'deny' },
					1,
					'user-1',
				),
			).rejects.toThrow(ConflictError);

			expect(scopeRepository.createScope).not.toHaveBeenCalled();
			expect(policyRepository.createPolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('creates the scope and its first document on first write', async () => {
			scopeRepository.findScopeByKindAndProjectForUpdate.mockResolvedValue(null);
			const createdScope = makeScope({ defaultAction: 'deny', version: 1 });
			scopeRepository.createScope.mockResolvedValue(createdScope);
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

		it('throws UserError when the scope already has multiple attachments', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProjectForUpdate.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'p1', rules: [RULE], priority: 0, isFloor: false },
				{ policyId: 'p2', rules: [], priority: 1, isFloor: false },
			]);

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [RULE], defaultAction: 'deny' },
					1,
					'user-1',
				),
			).rejects.toThrow('use PUT /scopes/:scopeId/attachments');

			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(policyRepository.createPolicy).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('updates the existing scope and document, emitting both facets', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProjectForUpdate.mockResolvedValue(scope);
			const existingPolicy = makePolicy({ rules: [], version: 1 });
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: existingPolicy.id, rules: [], priority: 0, isFloor: false },
			]);
			const updatedPolicy = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue({
				before: existingPolicy,
				after: updatedPolicy,
			});
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
	});
});
