import { mockLogger } from '@n8n/backend-test-utils';
import type { User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import type { WorkflowService } from '@/workflows/workflow.service';

// Stub the heavy module so importing the service under test doesn't pull the
// task-runner import chain; the service receives a typed mock instance anyway.
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: vi.fn() }));

import { MigrationRegistry } from '../breaking-changes.migration-registry.service';
import { BreakingChangeMigrationService } from '../breaking-changes.migration.service';
import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import {
	AiTransformDeprecatedRule,
	AI_TRANSFORM_NODE_TYPE,
} from '../rules/v3/ai-transform-deprecated.rule';
import { createNode } from './test-helpers';

describe('BreakingChangeMigrationService', () => {
	const logger = mockLogger();
	const user = mock<User>({ id: 'user-1' });
	const RULE_ID = 'ai-transform-deprecated';

	let ruleRegistry: RuleRegistry;
	let migrationRegistry: MigrationRegistry;
	let workflowFinderService: Mocked<WorkflowFinderService>;
	let workflowService: Mocked<WorkflowService>;
	let workflowValidationService: Mocked<WorkflowValidationService>;
	let nodeTypes: Mocked<NodeTypes>;
	let service: BreakingChangeMigrationService;

	const buildWorkflow = (nodes: INode[], overrides: Partial<WorkflowEntity> = {}) =>
		mock<WorkflowEntity>({ id: 'wf-1', name: 'My WF', nodes, ...overrides });

	beforeEach(() => {
		vi.clearAllMocks();

		ruleRegistry = new RuleRegistry(logger);
		ruleRegistry.registerAll([new AiTransformDeprecatedRule()]);
		migrationRegistry = new MigrationRegistry(logger);
		migrationRegistry.registerAll();

		workflowFinderService = mock<WorkflowFinderService>();
		workflowService = mock<WorkflowService>();
		workflowValidationService = mock<WorkflowValidationService>();
		nodeTypes = mock<NodeTypes>();

		service = new BreakingChangeMigrationService(
			ruleRegistry,
			migrationRegistry,
			workflowFinderService,
			workflowService,
			workflowValidationService,
			nodeTypes,
			logger,
		);
	});

	it('throws when no migration is registered for the rule', async () => {
		await expect(service.migrateWorkflow('unknown-rule', 'wf-1', user)).rejects.toThrow(
			"No automated migration is available for rule 'unknown-rule'.",
		);
	});

	it('throws when the workflow is not accessible', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(service.migrateWorkflow(RULE_ID, 'wf-1', user)).rejects.toThrow(
			'You do not have permission to update this workflow',
		);
		expect(workflowService.update).not.toHaveBeenCalled();
	});

	it('throws when the workflow has no affected nodes', async () => {
		const workflow = buildWorkflow([createNode('Set', 'n8n-nodes-base.set', {})]);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);

		await expect(service.migrateWorkflow(RULE_ID, 'wf-1', user)).rejects.toThrow(
			'no nodes affected',
		);
		expect(workflowService.update).not.toHaveBeenCalled();
	});

	it('aborts without saving when an affected node has no generated code', async () => {
		const aiNode = createNode('Transform', AI_TRANSFORM_NODE_TYPE, {
			instructions: 'x',
			jsCode: '',
		});
		const workflow = buildWorkflow([aiNode]);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);

		const error = await service.migrateWorkflow(RULE_ID, 'wf-1', user).catch((e: unknown) => e);
		// Carries the offending node so the UI can link to it.
		expect(error).toMatchObject({
			message: expect.stringContaining('no generated code yet'),
			meta: { nodeId: aiNode.id, nodeName: 'Transform' },
		});
		expect(workflowService.update).not.toHaveBeenCalled();
	});

	it('aborts the whole workflow (no save) when one of several affected nodes refuses', async () => {
		const okNode = createNode('Ok', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return items;' });
		const badNode = createNode('Bad', AI_TRANSFORM_NODE_TYPE, { jsCode: '' });
		workflowFinderService.findWorkflowForUser.mockResolvedValue(buildWorkflow([okNode, badNode]));

		const error = await service.migrateWorkflow(RULE_ID, 'wf-1', user).catch((e: unknown) => e);

		expect(error).toMatchObject({ meta: { nodeId: badNode.id, nodeName: 'Bad' } });
		// The migratable node is not saved either — the migration is all-or-nothing.
		expect(workflowService.update).not.toHaveBeenCalled();
	});

	it('rewrites the affected node in place and saves a new version', async () => {
		const aiNode = createNode('Transform', AI_TRANSFORM_NODE_TYPE, {
			jsCode: 'return items;',
			instructions: 'x',
		});
		const otherNode = createNode('Set', 'n8n-nodes-base.set', { value: 1 });
		const workflow = buildWorkflow([aiNode, otherNode]);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		workflowService.update.mockResolvedValue(mock<WorkflowEntity>({ versionId: 'new-version' }));

		const result = await service.migrateWorkflow(RULE_ID, 'wf-1', user);

		expect(result).toEqual({
			workflowId: 'wf-1',
			newVersionId: 'new-version',
			migratedNodeIds: [aiNode.id],
			unmapped: [],
			notes: [],
			// Not published on this version, so no one-click re-publish is offered.
			republishable: false,
		});

		// A checksum of the fetched workflow is passed so a concurrent edit is
		// rejected as a conflict rather than silently overwritten.
		const [, updateData, , updateOptions] = workflowService.update.mock.calls[0];
		expect(updateOptions).toEqual(
			expect.objectContaining({ expectedChecksum: expect.any(String) }),
		);
		const migrated = updateData.nodes.find((n) => n.id === aiNode.id)!;
		// Identity preserved so connections (keyed by node name) stay intact.
		expect(migrated.id).toBe(aiNode.id);
		expect(migrated.name).toBe('Transform');
		expect(migrated.position).toEqual(aiNode.position);
		// Type/params rewritten to a Code node.
		expect(migrated.type).toBe('n8n-nodes-base.code');
		expect(migrated.typeVersion).toBe(2);
		expect(migrated.parameters).toEqual({
			mode: 'runOnceForAllItems',
			language: 'javaScript',
			jsCode: 'return items;',
		});
		// Untouched node stays as-is.
		expect(updateData.nodes.find((n) => n.id === otherNode.id)).toEqual(otherNode);
	});

	it('marks a clean migration republishable when the published version was migrated and it validates', async () => {
		const aiNode = createNode('Transform', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return items;' });
		// Published version == the version being migrated.
		const workflow = buildWorkflow([aiNode], { versionId: 'v1', activeVersionId: 'v1' });
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		workflowService.update.mockResolvedValue(mock<WorkflowEntity>({ versionId: 'new-version' }));
		workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });

		const result = await service.migrateWorkflow(RULE_ID, 'wf-1', user);

		expect(result.republishable).toBe(true);
		// The MIGRATED node set (Code, not the original AI Transform) is what gets
		// validated, keyed by node name, with the workflow's connections and node types.
		expect(workflowValidationService.validateForActivation).toHaveBeenCalledWith(
			expect.objectContaining({
				Transform: expect.objectContaining({ type: 'n8n-nodes-base.code' }),
			}),
			workflow.connections,
			nodeTypes,
		);
	});

	it('is not republishable when the migration reports warnings, even on the published version', async () => {
		const aiNode = createNode('Transform', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return items;' });
		const workflow = buildWorkflow([aiNode], { versionId: 'v1', activeVersionId: 'v1' });
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		workflowService.update.mockResolvedValue(mock<WorkflowEntity>({ versionId: 'new-version' }));
		// A migration that carries a behavior-change note (not lossless).
		vi.spyOn(migrationRegistry, 'get').mockReturnValue({
			ruleId: RULE_ID,
			migrate: () => ({
				node: { type: 'n8n-nodes-base.code', typeVersion: 2, parameters: {} },
				notes: ['behavior changed'],
			}),
		});

		const result = await service.migrateWorkflow(RULE_ID, 'wf-1', user);

		expect(result.republishable).toBe(false);
		// A lossy migration short-circuits before the activation check.
		expect(workflowValidationService.validateForActivation).not.toHaveBeenCalled();
	});

	it('is not republishable when the migrated version was not the published one', async () => {
		const aiNode = createNode('Transform', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return items;' });
		// A draft (v2) sits ahead of the published version (v1).
		const workflow = buildWorkflow([aiNode], { versionId: 'v2', activeVersionId: 'v1' });
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		workflowService.update.mockResolvedValue(mock<WorkflowEntity>({ versionId: 'new-version' }));
		workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });

		const result = await service.migrateWorkflow(RULE_ID, 'wf-1', user);

		expect(result.republishable).toBe(false);
		// No point validating a workflow we won't offer to publish.
		expect(workflowValidationService.validateForActivation).not.toHaveBeenCalled();
	});

	it('is not republishable when the migrated workflow cannot be activated', async () => {
		const aiNode = createNode('Transform', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return items;' });
		const workflow = buildWorkflow([aiNode], { versionId: 'v1', activeVersionId: 'v1' });
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		workflowService.update.mockResolvedValue(mock<WorkflowEntity>({ versionId: 'new-version' }));
		// e.g. only a manual trigger, so activation validation fails.
		workflowValidationService.validateForActivation.mockReturnValue({
			isValid: false,
			error: 'no trigger',
		});

		const result = await service.migrateWorkflow(RULE_ID, 'wf-1', user);

		expect(result.republishable).toBe(false);
	});
});
