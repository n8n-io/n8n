import type { EventService } from '@n8n/backend-services';
import type { OperationContext, TransactionRunner } from '@n8n/db';
import type { NodeLoader } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ConflictError, NotFoundError } from '@n8n/errors';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

import { CREDENTIAL_TYPES_KIND } from '../constants';
import type { TypeAvailabilityPolicyAttachmentRepository } from '../database/repositories/type-availability-policy-attachment.repository';
import type { TypeAvailabilityPolicyScopeRepository } from '../database/repositories/type-availability-policy-scope.repository';
import type { TypeAvailabilityPolicyRepository } from '../database/repositories/type-availability-policy.repository';
import { TypeAvailabilityPolicy } from '../database/entities/type-availability-policy.entity';
import { TypeAvailabilityPolicyScope } from '../database/entities/type-availability-policy-scope.entity';
import { unconfiguredScope, type EffectivePolicy } from '../effective-policy';
import type { PolicyAttachment, PolicyRule } from '../policy-rule.types';
import type { TypeAvailabilityPolicySnapshot } from '../type-availability-policy-snapshot';
import { TypeAvailabilityPolicyService } from '../type-availability-policy.service';

const KIND = 'node-types';
const ROOT: OperationContext = {};

/**
 * A loader that has loaded `packageName`, with no nodes or credentials unless overridden.
 *
 * Built via `Object.assign` on an empty mock, not a `mock<NodeLoader>({...})` partial: the
 * mock's deep-partial typing does not converge on `NodeLoader['types']`'s node/credential
 * description unions (same pitfall noted for `INodeType` in test/integration/shared/utils).
 */
function makeLoader(packageName: string, overrides: Partial<NodeLoader> = {}): NodeLoader {
	const loader = mock<NodeLoader>();
	return Object.assign(loader, {
		packageName,
		known: { nodes: {}, credentials: {} },
		...overrides,
	});
}

const RULE: PolicyRule = {
	id: 'r1',
	action: 'deny',
	selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
};

const RULE_2: PolicyRule = { ...RULE, id: 'r2' };

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
	const snapshot = mock<TypeAvailabilityPolicySnapshot>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const nodeTypes = mock<NodeTypes>();

	const service = new TypeAvailabilityPolicyService(
		policyRepository,
		scopeRepository,
		attachmentRepository,
		transactionRunner,
		eventService,
		snapshot,
		loadNodesAndCredentials,
		nodeTypes,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		// An unloaded snapshot, so evaluations read the mocked repositories.
		snapshot.read.mockReturnValue(null);
		snapshot.projectScopes.mockReturnValue(null);
		snapshot.refreshAfterWrite.mockResolvedValue(undefined);
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ROOT));
		// Every fixture rule names `n8n-nodes-base`, so it must resolve as an installed package.
		loadNodesAndCredentials.loaders = { 'n8n-nodes-base': makeLoader('n8n-nodes-base') };
		// Fixture `name` rules name Slack, so it must resolve as a loaded node.
		Object.defineProperty(loadNodesAndCredentials, 'knownNodes', {
			configurable: true,
			value: { 'n8n-nodes-base.slack': { className: '', sourcePath: '' } },
		});
		nodeTypes.resolveBaseName.mockImplementation((name) => ({
			baseName: name,
			isSyntheticTool: false,
		}));
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

	describe('getAttachments', () => {
		it.each([
			[KIND, null],
			[KIND, 'project-1'],
			[CREDENTIAL_TYPES_KIND, null],
			[CREDENTIAL_TYPES_KIND, 'project-1'],
		])('reads %s attachments for project %s in evaluation order', async (kind, projectId) => {
			const ctx: OperationContext = {};
			const scope = makeScope({ kind, projectId, version: 7 });
			const normalLate: PolicyAttachment = {
				policyId: 'normal-late',
				rules: [RULE],
				priority: 10,
				isFloor: false,
			};
			const floorLate: PolicyAttachment = {
				policyId: 'floor-late',
				rules: [],
				priority: 20,
				isFloor: true,
			};
			const normalEarly: PolicyAttachment = {
				policyId: 'normal-early',
				rules: [],
				priority: -5,
				isFloor: false,
			};
			const floorEarly: PolicyAttachment = {
				policyId: 'floor-early',
				rules: [RULE],
				priority: 0,
				isFloor: true,
			};
			const stored = [normalLate, floorLate, normalEarly, floorEarly];
			scopeRepository.findScopeByIdAndKind.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue(stored);

			const result = await service.getAttachments(kind, scope.id, ctx);

			expect(result).toEqual({
				attachments: [floorEarly, floorLate, normalEarly, normalLate],
				version: 7,
			});
			expect(stored).toEqual([normalLate, floorLate, normalEarly, floorEarly]);
			expect(scopeRepository.findScopeByIdAndKind).toHaveBeenCalledWith(scope.id, kind, ctx);
			expect(attachmentRepository.listAttachmentsForScope).toHaveBeenCalledWith(scope.id, ctx);
			expect(scopeRepository.findScopeByIdAndKind.mock.invocationCallOrder[0]).toBeLessThan(
				attachmentRepository.listAttachmentsForScope.mock.invocationCallOrder[0],
			);
			expect(transactionRunner.run).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
			expect(snapshot.read).not.toHaveBeenCalled();
			expect(snapshot.refreshAfterWrite).not.toHaveBeenCalled();
		});

		it.each([KIND, CREDENTIAL_TYPES_KIND])('rejects an unknown scope for %s', async (kind) => {
			scopeRepository.findScopeByIdAndKind.mockResolvedValue(null);

			await expect(service.getAttachments(kind, 'missing')).rejects.toThrow(NotFoundError);
			expect(attachmentRepository.listAttachmentsForScope).not.toHaveBeenCalled();
		});

		it.each([KIND, CREDENTIAL_TYPES_KIND])(
			'rejects a scope of another kind for %s',
			async (kind) => {
				const otherKind = kind === KIND ? CREDENTIAL_TYPES_KIND : KIND;
				const scope = makeScope({ kind: otherKind });
				scopeRepository.findScopeByIdAndKind.mockImplementation(async (id, requestedKind) =>
					id === scope.id && requestedKind === scope.kind ? scope : null,
				);

				await expect(service.getAttachments(kind, scope.id)).rejects.toThrow(NotFoundError);
				expect(scopeRepository.findScopeByIdAndKind).toHaveBeenCalledWith(scope.id, kind, {});
				expect(attachmentRepository.listAttachmentsForScope).not.toHaveBeenCalled();
			},
		);
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
				origin: 'document-api',
				after: { rules: created.rules, version: created.version },
			});
		});

		it('tags the audit event with the credential-types kind for a credential policy write', async () => {
			const created = makePolicy({ kind: CREDENTIAL_TYPES_KIND });
			policyRepository.createPolicy.mockResolvedValue(created);

			await service.createPolicyDocument(CREDENTIAL_TYPES_KIND, [RULE], 'user-1');

			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-document-created',
				expect.objectContaining({ kind: CREDENTIAL_TYPES_KIND }),
			);
		});

		it('surfaces shadow-lint warnings without rejecting the write', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			const shadowed: PolicyRule = {
				id: 'r2',
				action: 'allow',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			};

			const { warnings } = await service.createPolicyDocument(KIND, [RULE, shadowed], 'user-1');

			expect(warnings).toEqual([{ kind: 'shadowed', ruleId: 'r2', shadowedByRuleId: 'r1' }]);
			expect(policyRepository.createPolicy).toHaveBeenCalled();
		});

		it('saves a package rule naming a package that is not installed, with a warning', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-nodes-not-installed' },
			};

			const { warnings } = await service.createPolicyDocument(KIND, [rule], 'user-1');

			expect(warnings).toEqual([{ kind: 'notLoaded', ruleId: 'r1' }]);
			expect(policyRepository.createPolicy).toHaveBeenCalled();
		});

		it('saves a name rule naming a node type that is not loaded, with a warning', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.notLoaded' },
			};

			const { warnings } = await service.createPolicyDocument(KIND, [rule], 'user-1');

			expect(warnings).toEqual([{ kind: 'notLoaded', ruleId: 'r1' }]);
		});

		it('checks a synthetic tool variant rule against its base node', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			nodeTypes.resolveBaseName.mockImplementation((name) => ({
				baseName: name.replace(/Tool$/, ''),
				isSyntheticTool: name.endsWith('Tool'),
			}));
			const rules: PolicyRule[] = [
				{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'n8n-nodes-base.slackTool' } },
				{ id: 'r2', action: 'deny', selector: { kind: 'name', value: 'n8n-nodes-base.fooTool' } },
			];

			const { warnings } = await service.createPolicyDocument(KIND, rules, 'user-1');

			expect(warnings).toEqual([{ kind: 'notLoaded', ruleId: 'r2' }]);
		});

		it('lists a shadowed warning before a notLoaded warning for the same rule, in rule order', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			const missing = (id: string): PolicyRule => ({
				id,
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.notLoaded' },
			});

			const { warnings } = await service.createPolicyDocument(
				KIND,
				[missing('r1'), RULE_2, missing('r3')],
				'user-1',
			);

			expect(warnings).toEqual([
				{ kind: 'notLoaded', ruleId: 'r1' },
				{ kind: 'shadowed', ruleId: 'r3', shadowedByRuleId: 'r1' },
				{ kind: 'notLoaded', ruleId: 'r3' },
			]);
		});

		describe('extends rules', () => {
			const familyRule = (id: string, value: string): PolicyRule => ({
				id,
				action: 'deny',
				selector: { kind: 'extends', value },
			});

			beforeEach(() => {
				Object.defineProperty(loadNodesAndCredentials, 'knownCredentials', {
					configurable: true,
					value: {
						oAuth2Api: { className: '', sourcePath: '' },
						googleSheetsOAuth2Api: { className: '', sourcePath: '', extends: ['oAuth2Api'] },
					},
				});
			});

			afterEach(() => {
				delete (loadNodesAndCredentials as { knownCredentials?: unknown }).knownCredentials;
			});

			it('rejects an extends rule in a node type policy', async () => {
				await expect(
					service.createPolicyDocument(KIND, [familyRule('r1', 'oAuth2Api')], 'user-1'),
				).rejects.toThrow('An "extends" rule is only valid in a credential type policy');
				expect(policyRepository.createPolicy).not.toHaveBeenCalled();
			});

			it('saves an extends rule naming a credential type that is not installed, with a warning', async () => {
				policyRepository.createPolicy.mockResolvedValue(
					makePolicy({ kind: CREDENTIAL_TYPES_KIND }),
				);

				const { warnings } = await service.createPolicyDocument(
					CREDENTIAL_TYPES_KIND,
					[familyRule('r1', 'notLoadedApi')],
					'user-1',
				);

				expect(warnings).toEqual([{ kind: 'notLoaded', ruleId: 'r1' }]);
			});

			it('saves a credential name rule naming a type that is not installed, with a warning', async () => {
				policyRepository.createPolicy.mockResolvedValue(
					makePolicy({ kind: CREDENTIAL_TYPES_KIND }),
				);
				const rule: PolicyRule = {
					id: 'r1',
					action: 'deny',
					selector: { kind: 'name', value: 'notLoadedApi' },
				};

				const { warnings } = await service.createPolicyDocument(
					CREDENTIAL_TYPES_KIND,
					[rule],
					'user-1',
				);

				expect(warnings).toEqual([{ kind: 'notLoaded', ruleId: 'r1' }]);
			});

			it('warns about a derived-type rule placed after the family rule that covers it', async () => {
				policyRepository.createPolicy.mockResolvedValue(
					makePolicy({ kind: CREDENTIAL_TYPES_KIND }),
				);
				const allowSheets: PolicyRule = {
					id: 'r2',
					action: 'allow',
					selector: { kind: 'name', value: 'googleSheetsOAuth2Api' },
				};

				const { warnings } = await service.createPolicyDocument(
					CREDENTIAL_TYPES_KIND,
					[familyRule('r1', 'oAuth2Api'), allowSheets],
					'user-1',
				);

				expect(warnings).toEqual([{ kind: 'shadowed', ruleId: 'r2', shadowedByRuleId: 'r1' }]);
			});
		});

		it('accepts a package rule naming an installed package', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy());
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-nodes-base' },
			};

			await expect(service.createPolicyDocument(KIND, [rule], 'user-1')).resolves.toBeDefined();
		});

		it('rejects a node type rule naming a credential-only node, and names the rule to write instead', async () => {
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-creds-base.virusTotalApi' },
			};

			await expect(service.createPolicyDocument(KIND, [rule], 'user-1')).rejects.toThrow(
				'Node type rule names the credential-only node "n8n-creds-base.virusTotalApi", which is HTTP Request with a credential attached. Write a credential type rule on "virusTotalApi" instead.',
			);
			expect(policyRepository.createPolicy).not.toHaveBeenCalled();
		});

		it('accepts a credential type rule on the type a credential-only node wraps', async () => {
			policyRepository.createPolicy.mockResolvedValue(makePolicy({ kind: CREDENTIAL_TYPES_KIND }));
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'name', value: 'virusTotalApi' },
			};

			await expect(
				service.createPolicyDocument(CREDENTIAL_TYPES_KIND, [rule], 'user-1'),
			).resolves.toBeDefined();
		});

		it('rejects a package rule on the credential-only prefix, which no loader provides', async () => {
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-creds-base' },
			};

			await expect(service.createPolicyDocument(KIND, [rule], 'user-1')).rejects.toThrow(
				'Package rule names "n8n-creds-base", which no package provides. Write a credential type rule instead.',
			);
			expect(policyRepository.createPolicy).not.toHaveBeenCalled();
		});
	});

	describe('updatePolicyDocument', () => {
		beforeEach(() => {
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([]);
			scopeRepository.lockScopesByIds.mockResolvedValue([]);
			scopeRepository.containsProjectScope.mockResolvedValue(false);
		});

		it('keeps accepting edits to a document whose package rule names an uninstalled package', async () => {
			const missingPackage: PolicyRule = {
				id: 'r-missing',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-nodes-mcp' },
			};
			policyRepository.findByIdAndKind.mockResolvedValue(
				makePolicy({ rules: [missingPackage], version: 1 }),
			);
			policyRepository.updateRules.mockResolvedValue(
				makePolicy({ rules: [missingPackage, RULE], version: 2 }),
			);

			const { warnings } = await service.updatePolicyDocument(
				KIND,
				'policy-1',
				[missingPackage, RULE],
				1,
				'user-1',
			);

			expect(warnings).toEqual([{ kind: 'notLoaded', ruleId: 'r-missing' }]);
			expect(policyRepository.updateRules).toHaveBeenCalled();
		});

		it('rejects a node type rule naming a credential-only node, before opening a transaction', async () => {
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-creds-base.virusTotalApi' },
			};

			await expect(
				service.updatePolicyDocument(KIND, 'policy-1', [rule], 1, 'user-1'),
			).rejects.toThrow('Node type rule names the credential-only node');
			expect(transactionRunner.run).not.toHaveBeenCalled();
		});

		it('rejects a delegate rule when the document is attached to a project scope, before reading it', async () => {
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);
			scopeRepository.containsProjectScope.mockResolvedValue(true);

			await expect(
				service.updatePolicyDocument(KIND, 'policy-1', [DELEGATE_RULE], 1, 'user-2'),
			).rejects.toThrow(DELEGATE_RULE_AT_PROJECT_SCOPE);

			expect(scopeRepository.containsProjectScope).toHaveBeenCalledWith(['scope-1'], ROOT);
			expect(policyRepository.findByIdAndKind).not.toHaveBeenCalled();
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('still accepts a delegate rule when the document is attached to instance scope only', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			policyRepository.findByIdAndKind.mockResolvedValue(before);
			policyRepository.updateRules.mockResolvedValue(
				makePolicy({ rules: [DELEGATE_RULE], version: 2 }),
			);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);
			scopeRepository.containsProjectScope.mockResolvedValue(false);

			await expect(
				service.updatePolicyDocument(KIND, before.id, [DELEGATE_RULE], 1, 'user-2'),
			).resolves.not.toThrow();

			expect(policyRepository.updateRules).toHaveBeenCalledWith(
				before.id,
				[DELEGATE_RULE],
				'user-2',
				ROOT,
			);
		});

		it('does not look up the scope kinds when the rules carry no delegate', async () => {
			policyRepository.findByIdAndKind.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
			policyRepository.updateRules.mockResolvedValue(makePolicy({ rules: [RULE], version: 2 }));
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

			await service.updatePolicyDocument(KIND, 'policy-1', [RULE], 1, 'user-2');

			expect(scopeRepository.containsProjectScope).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the document does not exist', async () => {
			policyRepository.findByIdAndKind.mockResolvedValue(null);

			await expect(
				service.updatePolicyDocument(KIND, 'missing', [RULE], 0, 'user-1'),
			).rejects.toThrow(NotFoundError);
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
		});

		it('throws ConflictError on a stale version and writes nothing', async () => {
			policyRepository.findByIdAndKind.mockResolvedValue(makePolicy({ version: 2 }));

			await expect(
				service.updatePolicyDocument(KIND, 'policy-1', [RULE], 1, 'user-2'),
			).rejects.toThrow(ConflictError);

			expect(policyRepository.findByIdAndKind).toHaveBeenCalledWith('policy-1', KIND, ROOT, true);
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('locks the attached scopes before the document, then bumps them and emits once', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			policyRepository.findByIdAndKind.mockResolvedValue(before);
			const after = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue(after);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-2', 'scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1', 'scope-2']);

			await service.updatePolicyDocument(KIND, before.id, [RULE], 1, 'user-2');

			expect(scopeRepository.lockScopesByIds).toHaveBeenCalledWith(['scope-2', 'scope-1'], ROOT);
			expect(scopeRepository.lockScopesByIds.mock.invocationCallOrder[0]).toBeLessThan(
				policyRepository.findByIdAndKind.mock.invocationCallOrder[0],
			);
			expect(scopeRepository.bumpVersions).toHaveBeenCalledWith(['scope-1', 'scope-2'], ROOT);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-document-updated', {
				updatedBy: 'user-2',
				kind: KIND,
				policyId: before.id,
				origin: 'document-api',
				before: { rules: [], version: 1 },
				after: { rules: [RULE], version: 2 },
			});
		});

		it('does not bump the attached scopes when the rules are unchanged', async () => {
			const unchanged = makePolicy({ rules: [RULE], version: 1 });
			policyRepository.findByIdAndKind.mockResolvedValue(unchanged);
			policyRepository.updateRules.mockResolvedValue(unchanged);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

			await service.updatePolicyDocument(KIND, unchanged.id, [RULE], 1, 'user-2');

			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledTimes(1);
		});

		it('throws NotFoundError when the update unexpectedly finds no row', async () => {
			policyRepository.findByIdAndKind.mockResolvedValue(makePolicy({ version: 1 }));
			policyRepository.updateRules.mockResolvedValue(null);

			await expect(
				service.updatePolicyDocument(KIND, 'policy-1', [RULE], 1, 'user-2'),
			).rejects.toThrow(NotFoundError);

			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('throws ConflictError when a scope was attached after the scopes were locked', async () => {
			const before = makePolicy({ rules: [], version: 1 });
			policyRepository.findByIdAndKind.mockResolvedValue(before);
			policyRepository.updateRules.mockResolvedValue(makePolicy({ rules: [RULE], version: 2 }));
			attachmentRepository.listScopeIdsAttachedToPolicy
				.mockResolvedValueOnce(['scope-1'])
				.mockResolvedValueOnce(['scope-1', 'scope-2']);
			scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

			await expect(
				service.updatePolicyDocument(KIND, before.id, [RULE], 1, 'user-2'),
			).rejects.toThrow(ConflictError);

			expect(scopeRepository.bumpVersions).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('deletePolicyDocument', () => {
		it('throws NotFoundError when the document does not exist', async () => {
			policyRepository.findByIdAndKind.mockResolvedValue(null);

			await expect(service.deletePolicyDocument(KIND, 'missing', 'user-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(attachmentRepository.listScopeIdsAttachedToPolicy).not.toHaveBeenCalled();
		});

		it('throws ConflictError when still attached, and never calls delete', async () => {
			const existing = makePolicy();
			policyRepository.findByIdAndKind.mockResolvedValue(existing);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1', 'scope-2']);

			await expect(service.deletePolicyDocument(KIND, existing.id, 'user-1')).rejects.toThrow(
				ConflictError,
			);
			expect(policyRepository.deletePolicy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('deletes and emits once when detached', async () => {
			const existing = makePolicy();
			policyRepository.findByIdAndKind.mockResolvedValue(existing);
			attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue([]);

			await service.deletePolicyDocument(KIND, existing.id, 'user-1');

			expect(policyRepository.findByIdAndKind).toHaveBeenCalledWith(existing.id, KIND, ROOT, true);
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

	describe('getPolicyDocument', () => {
		it('scopes the lookup by kind, so an id alone cannot reach another kind', async () => {
			const policy = makePolicy();
			policyRepository.findByIdAndKind.mockResolvedValue(policy);

			await expect(service.getPolicyDocument(KIND, policy.id)).resolves.toBe(policy);

			expect(policyRepository.findByIdAndKind).toHaveBeenCalledWith(policy.id, KIND, ROOT);
		});

		it('returns null when the document belongs to another kind', async () => {
			policyRepository.findByIdAndKind.mockResolvedValue(null);

			await expect(service.getPolicyDocument(KIND, 'policy-1')).resolves.toBeNull();
		});
	});

	describe('replaceAttachments', () => {
		it('rejects a duplicate policyId before any repository call', async () => {
			await expect(
				service.replaceAttachments(
					KIND,
					'scope-1',
					[
						{ policyId: 'p1', priority: 0, isFloor: false },
						{ policyId: 'p1', priority: 1, isFloor: false },
					],
					1,
					'user-1',
				),
			).rejects.toThrow('Duplicate policyId');

			expect(scopeRepository.findScopeByIdAndKind).not.toHaveBeenCalled();
			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('rejects a duplicate (isFloor, priority) pair before any repository call', async () => {
			await expect(
				service.replaceAttachments(
					KIND,
					'scope-1',
					[
						{ policyId: 'p1', priority: 0, isFloor: false },
						{ policyId: 'p2', priority: 0, isFloor: false },
					],
					1,
					'user-1',
				),
			).rejects.toThrow('Duplicate (isFloor, priority)');

			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the scope does not exist', async () => {
			scopeRepository.findScopeByIdAndKind.mockResolvedValue(null);

			await expect(
				service.replaceAttachments(
					KIND,
					'missing',
					[{ policyId: 'p1', priority: 0, isFloor: false }],
					1,
					'user-1',
				),
			).rejects.toThrow(NotFoundError);
		});

		it('throws NotFoundError when the scope belongs to another kind, even with no attachments to check', async () => {
			// A scope of another kind must read as "not found" here, the same way a foreign-kind
			// policy document does — an empty attachment list would otherwise sail past
			// `assertAttachableToScope`, which only compares an attached document's kind to the
			// scope's, and never learns the caller's own intended kind.
			scopeRepository.findScopeByIdAndKind.mockResolvedValue(null);

			await expect(
				service.replaceAttachments(CREDENTIAL_TYPES_KIND, 'scope-1', [], 1, 'user-1'),
			).rejects.toThrow(NotFoundError);

			expect(scopeRepository.findScopeByIdAndKind).toHaveBeenCalledWith(
				'scope-1',
				CREDENTIAL_TYPES_KIND,
				ROOT,
				true,
			);
			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('throws ConflictError for a stale version and writes nothing', async () => {
			const scope = makeScope({ version: 2 });
			scopeRepository.findScopeByIdAndKind.mockResolvedValueOnce(scope);

			const write = service.replaceAttachments(KIND, scope.id, [], 1, 'user-1');
			await expect(write).rejects.toThrow(ConflictError);
			await expect(write).rejects.toThrow(
				'Policy scope has changed since it was last read (expected version 1, found 2)',
			);

			expect(scopeRepository.findScopeByIdAndKind).toHaveBeenCalledWith(scope.id, KIND, ROOT, true);
			expect(attachmentRepository.replaceAttachmentsForScope).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(snapshot.refreshAfterWrite).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('replaces attachments with the current version, bumps the version, and emits once', async () => {
			const scope = makeScope({ version: 1 });
			scopeRepository.findScopeByIdAndKind.mockResolvedValueOnce(scope);
			scopeRepository.findScopeById.mockResolvedValueOnce(makeScope({ version: 2 }));
			attachmentRepository.listAttachmentsForScope
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ policyId: 'p1', rules: [RULE], priority: 0, isFloor: false }]);

			const result = await service.replaceAttachments(
				KIND,
				scope.id,
				[{ policyId: 'p1', priority: 0, isFloor: false }],
				scope.version,
				'user-1',
			);

			expect(scopeRepository.findScopeByIdAndKind).toHaveBeenCalledWith(scope.id, KIND, ROOT, true);
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
			scopeRepository.findScopeByIdAndKind.mockResolvedValueOnce(scope);
			scopeRepository.findScopeById.mockResolvedValueOnce(null);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

			const result = await service.replaceAttachments(
				KIND,
				scope.id,
				[{ policyId: 'p1', priority: 0, isFloor: false }],
				scope.version,
				'user-1',
			);

			expect(result.version).toBe(2);
		});

		it.each([
			[KIND, null],
			[KIND, 'project-1'],
			[CREDENTIAL_TYPES_KIND, null],
			[CREDENTIAL_TYPES_KIND, 'project-1'],
		])('returns %s attachments for project %s in evaluation order', async (kind, projectId) => {
			const scope = makeScope({ kind, projectId, version: 1 });
			const stored: PolicyAttachment[] = [
				{ policyId: 'normal-late', rules: [RULE], priority: 10, isFloor: false },
				{ policyId: 'floor-late', rules: [], priority: 20, isFloor: true },
				{ policyId: 'normal-early', rules: [], priority: -5, isFloor: false },
				{ policyId: 'floor-early', rules: [RULE], priority: 0, isFloor: true },
			];
			scopeRepository.findScopeByIdAndKind.mockResolvedValueOnce(scope);
			scopeRepository.findScopeById.mockResolvedValueOnce(
				makeScope({ kind, projectId, version: 2 }),
			);
			policyRepository.findManyByIds.mockResolvedValue([]);
			attachmentRepository.listAttachmentsForScope
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(stored);

			const result = await service.replaceAttachments(
				kind,
				scope.id,
				stored.map(({ policyId, priority, isFloor }) => ({ policyId, priority, isFloor })),
				scope.version,
				'user-1',
			);

			expect(result).toEqual({
				attachments: [stored[3], stored[1], stored[2], stored[0]],
				version: 2,
			});
		});

		it('rejects attaching a document with a delegate rule to a project scope, and writes nothing', async () => {
			scopeRepository.findScopeByIdAndKind.mockResolvedValue(makeScope({ projectId: 'project-1' }));
			policyRepository.findManyByIds.mockResolvedValue([
				makePolicy({ id: 'p1', rules: [RULE] }),
				makePolicy({ id: 'p2', rules: [DELEGATE_RULE] }),
			]);

			await expect(
				service.replaceAttachments(
					KIND,
					'scope-1',
					[
						{ policyId: 'p1', priority: 0, isFloor: false },
						{ policyId: 'p2', priority: 1, isFloor: false },
					],
					1,
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
			scopeRepository.findScopeByIdAndKind.mockResolvedValue(makeScope({ projectId: null }));
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

			await service.replaceAttachments(
				KIND,
				'scope-1',
				[{ policyId: 'p-delegating', priority: 0, isFloor: false }],
				1,
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

		it('rejects a package rule on the credential-only prefix, before opening a transaction', async () => {
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-creds-base' },
			};

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [rule], defaultAction: 'allow' },
					0,
					'user-1',
				),
			).rejects.toThrow('Package rule names "n8n-creds-base"');
			expect(transactionRunner.run).not.toHaveBeenCalled();
		});

		it('rejects a node type rule naming a credential-only node, before opening a transaction', async () => {
			const rule: PolicyRule = {
				id: 'r1',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-creds-base.virusTotalApi' },
			};

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [rule], defaultAction: 'allow' },
					0,
					'user-1',
				),
			).rejects.toThrow('Node type rule names the credential-only node');
			expect(transactionRunner.run).not.toHaveBeenCalled();
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
			policyRepository.findByIdAndKind.mockResolvedValue(makePolicy({ rules: [] }));

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
			policyRepository.findByIdAndKind.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
			policyRepository.updateRules.mockResolvedValue(makePolicy({ rules: [RULE], version: 2 }));
			scopeRepository.findScopeById.mockResolvedValue(makeScope({ version: 2 }));

			await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'allow' },
				1,
				'user-2',
			);

			expect(policyRepository.findByIdAndKind).toHaveBeenCalledWith('policy-1', KIND, ROOT, true);
			expect(policyRepository.findByIdAndKind.mock.invocationCallOrder[0]).toBeLessThan(
				attachmentRepository.listScopeIdsAttachedToPolicy.mock.invocationCallOrder[0],
			);
			expect(scopeRepository.bumpVersion).toHaveBeenCalledWith(scope.id, ROOT);
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
				makeScope({ defaultAction: 'delegate', version: 1 }),
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
				makeScope({ defaultAction: 'deny', version: 1 }),
			);

			const result = await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [RULE], defaultAction: 'deny' },
				0,
				'user-1',
			);

			expect(result.version).toBe(1);
			expect(result.rules).toEqual([RULE]);
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(attachmentRepository.replaceAttachmentsForScope).toHaveBeenCalledWith(
				createdScope.id,
				[{ policyId: createdPolicy.id, priority: 0, isFloor: false }],
				ROOT,
			);
			expect(eventService.emit).toHaveBeenCalledTimes(3);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-scope-updated',
				expect.objectContaining({ before: null }),
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-document-created',
				expect.objectContaining({ policyId: createdPolicy.id, origin: 'composed-save' }),
			);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-saved', {
				updatedBy: 'user-1',
				kind: KIND,
				projectId: null,
				scopeId: createdScope.id,
				before: null,
				after: { defaultAction: 'deny', version: 1 },
				rulesBefore: null,
				rulesAfter: [RULE],
				shadowWarningCount: 0,
				notLoadedWarningCount: 0,
			});
		});

		it('updates the existing scope and document, emitting both facets', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			const existingPolicy = makePolicy({ rules: [], version: 1 });
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: existingPolicy.id, rules: [], priority: 0, isFloor: false },
			]);
			policyRepository.findByIdAndKind.mockResolvedValue(existingPolicy);
			const updatedPolicy = makePolicy({ rules: [RULE], version: 2 });
			policyRepository.updateRules.mockResolvedValue(updatedPolicy);
			scopeRepository.findScopeById.mockResolvedValue(
				makeScope({ defaultAction: 'deny', version: 2 }),
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
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledTimes(3);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-document-updated',
				expect.objectContaining({
					origin: 'composed-save',
					before: { rules: [], version: 1 },
					after: { rules: [RULE], version: 2 },
				}),
			);
			expect(eventService.emit).toHaveBeenCalledWith('node-type-policy-saved', {
				updatedBy: 'user-2',
				kind: KIND,
				projectId: null,
				scopeId: scope.id,
				before: { defaultAction: 'allow', version: 1 },
				after: { defaultAction: 'deny', version: 2 },
				rulesBefore: [],
				rulesAfter: [RULE],
				shadowWarningCount: 0,
				notLoadedWarningCount: 0,
			});
		});

		it('saves a rule for an uninstalled package, returns its warning and counts it apart', async () => {
			const missingPackage: PolicyRule = {
				id: 'r-missing',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-nodes-mcp' },
			};
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			const existingPolicy = makePolicy({ rules: [missingPackage], version: 1 });
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: existingPolicy.id, rules: [missingPackage], priority: 0, isFloor: false },
			]);
			policyRepository.findByIdAndKind.mockResolvedValue(existingPolicy);
			policyRepository.updateRules.mockResolvedValue(
				makePolicy({ rules: [missingPackage, RULE, RULE_2], version: 2 }),
			);
			scopeRepository.findScopeById.mockResolvedValue(makeScope({ version: 2 }));

			const result = await service.setEffectivePolicy(
				KIND,
				null,
				{ rules: [missingPackage, RULE, RULE_2], defaultAction: 'allow' },
				1,
				'user-2',
			);

			expect(result.warnings).toEqual([
				{ kind: 'notLoaded', ruleId: 'r-missing' },
				{ kind: 'shadowed', ruleId: 'r2', shadowedByRuleId: 'r1' },
			]);
			expect(eventService.emit).toHaveBeenCalledWith(
				'node-type-policy-saved',
				expect.objectContaining({ shadowWarningCount: 1, notLoadedWarningCount: 1 }),
			);
		});

		it('throws NotFoundError when the document update unexpectedly finds no row', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
			]);
			policyRepository.findByIdAndKind.mockResolvedValue(makePolicy({ rules: [], version: 1 }));
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

		it('refuses to edit the attached document when it belongs to another kind', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'policy-1', rules: [], priority: 0, isFloor: false },
			]);
			// The id resolves, but only under the other kind — what the scoped read filters out.
			policyRepository.findByIdAndKind.mockImplementation(async (_id, kind) =>
				kind === KIND ? null : makePolicy({ kind: 'other-kind' }),
			);

			await expect(
				service.setEffectivePolicy(
					KIND,
					null,
					{ rules: [RULE], defaultAction: 'allow' },
					1,
					'user-2',
				),
			).rejects.toThrow(NotFoundError);

			expect(policyRepository.findByIdAndKind).toHaveBeenCalledWith('policy-1', KIND, ROOT, true);
			expect(policyRepository.updateRules).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
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

		it('moves the version once when neither the rules nor the default action change', async () => {
			const scope = makeScope({ defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(scope);
			const existingPolicy = makePolicy({ rules: [RULE], version: 1 });
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: existingPolicy.id, rules: [RULE], priority: 0, isFloor: false },
			]);
			policyRepository.findByIdAndKind.mockResolvedValue(existingPolicy);
			policyRepository.updateRules.mockResolvedValue(existingPolicy);
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

			expect(scopeRepository.updateDefaultAction).not.toHaveBeenCalled();
			expect(scopeRepository.bumpVersion).toHaveBeenCalledTimes(1);
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

		it('matches a credential type against a package rule via the loader that loaded it', async () => {
			const CREDENTIAL_TYPE = 'slackApi';
			loadNodesAndCredentials.loaders = {
				'n8n-nodes-base': makeLoader('n8n-nodes-base', {
					known: {
						nodes: {},
						credentials: {
							[CREDENTIAL_TYPE]: { className: 'SlackApi', sourcePath: 'SlackApi.credentials.js' },
						},
					},
				}),
			};
			const packageDenyRule: PolicyRule = {
				id: 'deny-package',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-nodes-base' },
			};
			const instanceScope = makeScope({
				kind: CREDENTIAL_TYPES_KIND,
				projectId: null,
				defaultAction: 'allow',
				version: 1,
			});
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				projectId === null ? instanceScope : null,
			);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'p1', rules: [packageDenyRule], priority: 0, isFloor: false },
			]);

			const result = await service.evaluateComposedType(
				CREDENTIAL_TYPES_KIND,
				PROJECT_ID,
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({
				action: 'deny',
				scope: 'instance',
				matchedRuleId: 'deny-package',
				optInAvailable: false,
			});
		});

		it('never matches a credential type against a package rule under the node-types dot-split convention', async () => {
			const CREDENTIAL_TYPE = 'slackApi';
			const packageDenyRule: PolicyRule = {
				id: 'deny-package',
				action: 'deny',
				selector: { kind: 'package', value: 'n8n-nodes-base' },
			};
			const instanceScope = makeScope({ projectId: null, defaultAction: 'allow', version: 1 });
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				projectId === null ? instanceScope : null,
			);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'p1', rules: [packageDenyRule], priority: 0, isFloor: false },
			]);

			// Evaluated under `node-types`, a bare credential type name has no dot to split on,
			// so the package selector cannot match it: nothing denies.
			const result = await service.evaluateComposedType(KIND, PROJECT_ID, CREDENTIAL_TYPE);

			expect(result).toEqual({
				action: 'allow',
				scope: 'instance',
				matchedRuleId: null,
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

	describe('evaluateComposedTypesFor', () => {
		const PROJECT_ID = 'project-1';
		const TYPE = 'n8n-nodes-base.slack';

		it('reports the version of both scopes it read', async () => {
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				makeScope(
					projectId === null
						? { projectId: null, version: 4 }
						: { id: 'scope-2', projectId: PROJECT_ID, version: 2 },
				),
			);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

			const result = await service.evaluateComposedTypesFor(KIND, PROJECT_ID, [TYPE]);

			expect(result.versions).toEqual([
				{ scope: 'instance', version: 4 },
				{ scope: 'project', version: 2 },
			]);
		});

		it('reports version 0 for a scope that has no row yet', async () => {
			scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);

			const result = await service.evaluateComposedTypesFor(KIND, PROJECT_ID, [TYPE]);

			expect(result.versions).toEqual([
				{ scope: 'instance', version: 0 },
				{ scope: 'project', version: 0 },
			]);
			expect(result.verdicts).toEqual([
				{
					name: TYPE,
					action: 'allow',
					scope: 'instance',
					matchedRuleId: null,
					optInAvailable: false,
				},
			]);
		});

		describe('with no project scope', () => {
			it('reads only the instance scope', async () => {
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(
					makeScope({ projectId: null, version: 4 }),
				);
				attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

				const result = await service.evaluateComposedTypesFor(KIND, null, [TYPE]);

				expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledTimes(1);
				expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(KIND, null, ROOT);
				expect(result.versions).toEqual([{ scope: 'instance', version: 4 }]);
			});

			it('still lets an instance deny decide', async () => {
				const denyRule: PolicyRule = {
					id: 'instance-deny',
					action: 'deny',
					selector: { kind: 'name', value: TYPE },
				};
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(makeScope({ projectId: null }));
				attachmentRepository.listAttachmentsForScope.mockResolvedValue([
					{ policyId: 'p1', rules: [denyRule], priority: 0, isFloor: false },
				]);

				const result = await service.evaluateComposedTypesFor(KIND, null, [TYPE]);

				expect(result.verdicts[0]).toEqual({
					name: TYPE,
					action: 'deny',
					scope: 'instance',
					matchedRuleId: 'instance-deny',
					optInAvailable: false,
				});
			});

			it('denies an instance delegate, which no project can satisfy here', async () => {
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(
					makeScope({ projectId: null, defaultAction: 'delegate' }),
				);
				attachmentRepository.listAttachmentsForScope.mockResolvedValue([]);

				const result = await service.evaluateComposedTypesFor(KIND, null, [TYPE]);

				expect(result.verdicts[0]).toEqual({
					name: TYPE,
					action: 'deny',
					scope: 'instance',
					matchedRuleId: null,
					optInAvailable: true,
				});
			});
		});

		describe('tool variants', () => {
			const GMAIL = 'n8n-nodes-base.gmail';
			const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';

			beforeEach(() => {
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(makeScope({ projectId: null }));
				attachmentRepository.listAttachmentsForScope.mockResolvedValue([
					{
						policyId: 'p1',
						rules: [{ id: 'deny-gmail', action: 'deny', selector: { kind: 'name', value: GMAIL } }],
						priority: 0,
						isFloor: false,
					},
				]);
			});

			it('judges a node type by the base name the registry resolves it to', async () => {
				nodeTypes.resolveBaseName.mockImplementation((name) => ({
					baseName: name === GMAIL_TOOL ? GMAIL : name,
					isSyntheticTool: name === GMAIL_TOOL,
				}));

				const result = await service.evaluateComposedTypesFor(KIND, null, [GMAIL_TOOL]);

				expect(result.verdicts).toEqual([
					{
						name: GMAIL_TOOL,
						action: 'deny',
						scope: 'instance',
						matchedRuleId: 'deny-gmail',
						optInAvailable: false,
					},
				]);
			});

			it('does not resolve a base name for a credential type', async () => {
				await service.evaluateComposedTypesFor(CREDENTIAL_TYPES_KIND, null, ['gmailApi']);

				expect(nodeTypes.resolveBaseName).not.toHaveBeenCalled();
			});
		});
	});

	describe('reading the snapshot', () => {
		const PROJECT_ID = 'project-1';
		const TYPE = 'n8n-nodes-base.slack';

		// The composer evaluates `attachments`, so the rules are mirrored into one attachment.
		function loadedPolicy(overrides: Partial<EffectivePolicy>): EffectivePolicy {
			const rules = overrides.rules ?? [];
			const attachments =
				rules.length === 0 ? [] : [{ policyId: 'p1', rules, priority: 0, isFloor: false }];

			return { ...unconfiguredScope(KIND, null), attachments, ...overrides };
		}

		function givenSnapshotScopes(instance: EffectivePolicy, project: EffectivePolicy) {
			snapshot.read.mockImplementation((_kind, projectId) =>
				projectId === null ? instance : project,
			);
		}

		it('decides from the snapshot rules without reading a repository', async () => {
			givenSnapshotScopes(
				loadedPolicy({ scopeId: 'scope-1', version: 4, rules: [RULE] }),
				loadedPolicy({ scopeId: 'scope-2', projectId: PROJECT_ID, version: 2 }),
			);

			const result = await service.evaluateComposedTypesFor(KIND, PROJECT_ID, [TYPE]);

			expect(result.verdicts).toEqual([
				{
					name: TYPE,
					action: 'deny',
					scope: 'instance',
					matchedRuleId: 'r1',
					optInAvailable: false,
				},
			]);
			expect(result.versions).toEqual([
				{ scope: 'instance', version: 4 },
				{ scope: 'project', version: 2 },
			]);
			expect(scopeRepository.findScopeByKindAndProject).not.toHaveBeenCalled();
			expect(attachmentRepository.listAttachmentsForScope).not.toHaveBeenCalled();
		});

		it('falls back to the repositories when the snapshot has not loaded', async () => {
			snapshot.read.mockReturnValue(null);
			scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) =>
				makeScope(
					projectId === null
						? { projectId: null, version: 4 }
						: { id: 'scope-2', projectId: PROJECT_ID, version: 2 },
				),
			);
			attachmentRepository.listAttachmentsForScope.mockResolvedValue([
				{ policyId: 'p1', rules: [RULE], priority: 0, isFloor: false },
			]);

			const result = await service.evaluateComposedTypesFor(KIND, PROJECT_ID, [TYPE]);

			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(KIND, null, ROOT);
			expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(
				KIND,
				PROJECT_ID,
				ROOT,
			);
			expect(result.verdicts[0]).toMatchObject({ action: 'deny', matchedRuleId: 'r1' });
			expect(result.versions).toEqual([
				{ scope: 'instance', version: 4 },
				{ scope: 'project', version: 2 },
			]);
		});

		describe('evaluateComposedTypesForAllProjects', () => {
			it('uses the snapshot project scopes without reading a repository', async () => {
				snapshot.read.mockReturnValue(loadedPolicy({ scopeId: 'scope-1' }));
				snapshot.projectScopes.mockReturnValue([
					loadedPolicy({
						scopeId: 'scope-2',
						projectId: 'project-a',
						rules: [RULE],
					}) as EffectivePolicy & {
						projectId: string;
					},
					loadedPolicy({ scopeId: 'scope-3', projectId: 'project-b' }) as EffectivePolicy & {
						projectId: string;
					},
				]);

				const result = await service.evaluateComposedTypesForAllProjects(KIND, [TYPE]);

				expect(snapshot.projectScopes).toHaveBeenCalledWith(KIND);
				expect(result.byProject.map(({ projectId }) => projectId)).toEqual([
					'project-a',
					'project-b',
				]);
				expect(result.byProject[0].verdicts[0]).toMatchObject({ action: 'deny', scope: 'project' });
				expect(result.byProject[1].verdicts[0]).toMatchObject({ action: 'allow' });
				expect(result.withoutProjectPolicy[0]).toMatchObject({ action: 'allow' });
				expect(scopeRepository.findProjectScopes).not.toHaveBeenCalled();
				expect(attachmentRepository.listAttachmentsForScopes).not.toHaveBeenCalled();
			});

			it('falls back to the repositories when the snapshot has not loaded', async () => {
				snapshot.read.mockReturnValue(null);
				snapshot.projectScopes.mockReturnValue(null);
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(null);
				scopeRepository.findProjectScopes.mockResolvedValue([
					makeScope({ id: 'scope-2', projectId: 'project-a' }) as TypeAvailabilityPolicyScope & {
						projectId: string;
					},
				]);
				attachmentRepository.listAttachmentsForScopes.mockResolvedValue(
					new Map([['scope-2', [{ policyId: 'p1', rules: [RULE], priority: 0, isFloor: false }]]]),
				);

				const result = await service.evaluateComposedTypesForAllProjects(KIND, [TYPE]);

				expect(scopeRepository.findProjectScopes).toHaveBeenCalledWith(KIND, {});
				expect(attachmentRepository.listAttachmentsForScopes).toHaveBeenCalledWith(['scope-2'], {});
				expect(result.byProject).toHaveLength(1);
				expect(result.byProject[0].projectId).toBe('project-a');
				expect(result.byProject[0].verdicts[0]).toMatchObject({ action: 'deny', scope: 'project' });
			});
		});

		describe('after a write', () => {
			let committed: boolean;
			let committedAtRefresh: boolean | undefined;

			beforeEach(() => {
				committed = false;
				committedAtRefresh = undefined;
				transactionRunner.run.mockImplementation(async (_ctx, fn) => {
					const result = await fn(ROOT);
					committed = true;
					return result;
				});
				snapshot.refreshAfterWrite.mockImplementation(async () => {
					committedAtRefresh = committed;
				});
			});

			function expectRefreshedOnceAfterCommit() {
				expect(snapshot.refreshAfterWrite).toHaveBeenCalledTimes(1);
				expect(committedAtRefresh).toBe(true);
				expect(transactionRunner.run.mock.invocationCallOrder[0]).toBeLessThan(
					snapshot.refreshAfterWrite.mock.invocationCallOrder[0],
				);
			}

			it('refreshes once after setDefaultAction commits a changed scope', async () => {
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(makeScope({ version: 1 }));
				scopeRepository.updateDefaultAction.mockResolvedValue(
					makeScope({ defaultAction: 'deny', version: 2 }),
				);

				await service.setDefaultAction(KIND, null, 'deny', 1, 'user-2');

				expectRefreshedOnceAfterCommit();
			});

			it('does not refresh when setDefaultAction changes nothing', async () => {
				scopeRepository.findScopeByKindAndProject.mockResolvedValue(
					makeScope({ defaultAction: 'deny', version: 1 }),
				);
				scopeRepository.updateDefaultAction.mockResolvedValue(
					makeScope({ defaultAction: 'deny', version: 1 }),
				);

				await service.setDefaultAction(KIND, null, 'deny', 1, 'user-2');

				expect(snapshot.refreshAfterWrite).not.toHaveBeenCalled();
			});

			describe('updatePolicyDocument', () => {
				beforeEach(() => {
					scopeRepository.containsProjectScope.mockResolvedValue(false);
				});

				it('does not refresh when the document version does not change', async () => {
					const unchanged = makePolicy({ rules: [RULE], version: 1 });
					policyRepository.findByIdAndKind.mockResolvedValue(unchanged);
					policyRepository.updateRules.mockResolvedValue(unchanged);
					attachmentRepository.listScopeIdsAttachedToPolicy.mockResolvedValue(['scope-1']);
					scopeRepository.lockScopesByIds.mockResolvedValue(['scope-1']);

					await service.updatePolicyDocument(KIND, unchanged.id, [RULE], 1, 'user-2');

					expect(snapshot.refreshAfterWrite).not.toHaveBeenCalled();
				});
			});
		});
	});
});
