import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { RemovedNodesRule } from '../removed-nodes.rule';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../../types';

describe('RemovedNodesRule', () => {
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		error: jest.fn(),
	});

	let workflowRepository: jest.Mocked<WorkflowRepository>;
	let rule: RemovedNodesRule;

	type WorkflowData = {
		id: string;
		name: string;
		active: boolean;
		nodes?: INode[];
	};

	const createWorkflow = (
		id: string,
		name: string,
		nodes: INode[],
		active = true,
	): WorkflowData => ({
		id,
		name,
		active,
		nodes,
	});

	const createNode = (name: string, type: string): INode => ({
		id: `node-${name}`,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});

	beforeEach(() => {
		jest.clearAllMocks();
		workflowRepository = mock<WorkflowRepository>();
		rule = new RemovedNodesRule(workflowRepository, logger);
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				id: 'removed-nodes-v2',
				version: 'v2',
				title: 'Removed Deprecated Nodes',
				description: 'Several deprecated nodes have been removed and will no longer work',
				category: BreakingChangeCategory.WORKFLOW,
				severity: BreakingChangeSeverity.CRITICAL,
			});
		});
	});

	describe('detect()', () => {
		it('should return no issues when no removed nodes are found', async () => {
			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([]);

			const result = await rule.detect();

			expect(result).toEqual({
				ruleId: 'removed-nodes-v2',
				isAffected: false,
				affectedWorkflows: [],
				instanceIssues: [],
				recommendations: [],
			});
		});

		it('should detect spontit node', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit', 'n8n-nodes-base.spontit'),
			]);

			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([workflow]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows).toHaveLength(1);
			expect(result.affectedWorkflows[0]).toMatchObject({
				id: 'wf-1',
				name: 'Test Workflow',
				active: true,
				issues: [
					{
						title: "Node 'n8n-nodes-base.spontit' has been removed",
						description:
							"The node type 'n8n-nodes-base.spontit' is no longer available. Please replace it with an alternative.",
						level: IssueLevel.ERROR,
					},
				],
			});
			expect(result.recommendations).toHaveLength(1);
			expect(result.recommendations[0]).toMatchObject({
				action: 'Update affected workflows',
				description: 'Replace removed nodes with their updated versions or alternatives',
			});
		});

		it('should detect crowdDev node', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('CrowdDev', 'n8n-nodes-base.crowdDev'),
			]);

			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([workflow]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows[0].issues[0].title).toBe(
				"Node 'n8n-nodes-base.crowdDev' has been removed",
			);
		});

		it('should detect kitemaker node', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Kitemaker', 'n8n-nodes-base.kitemaker'),
			]);

			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([workflow]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows[0].issues[0].title).toBe(
				"Node 'n8n-nodes-base.kitemaker' has been removed",
			);
		});

		it('should detect multiple removed nodes in the same workflow', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit', 'n8n-nodes-base.spontit'),
				createNode('CrowdDev', 'n8n-nodes-base.crowdDev'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'), // Not removed
			]);

			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([workflow]);

			const result = await rule.detect();

			expect(result.affectedWorkflows[0].issues).toHaveLength(2);
			expect(result.affectedWorkflows[0].issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						title: "Node 'n8n-nodes-base.spontit' has been removed",
					}),
					expect.objectContaining({
						title: "Node 'n8n-nodes-base.crowdDev' has been removed",
					}),
				]),
			);
		});

		it('should detect removed nodes across multiple workflows', async () => {
			const workflow1 = createWorkflow('wf-1', 'Workflow 1', [
				createNode('Spontit', 'n8n-nodes-base.spontit'),
			]);
			const workflow2 = createWorkflow('wf-2', 'Workflow 2', [
				createNode('Kitemaker', 'n8n-nodes-base.kitemaker'),
			]);

			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([workflow1, workflow2]);

			const result = await rule.detect();

			expect(result.affectedWorkflows).toHaveLength(2);
			expect(result.affectedWorkflows[0].id).toBe('wf-1');
			expect(result.affectedWorkflows[1].id).toBe('wf-2');
		});

		it('should include inactive workflows', async () => {
			const workflow = createWorkflow(
				'wf-1',
				'Inactive Workflow',
				[createNode('Spontit', 'n8n-nodes-base.spontit')],
				false,
			);

			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([workflow]);

			const result = await rule.detect();

			expect(result.affectedWorkflows[0]).toMatchObject({
				id: 'wf-1',
				name: 'Inactive Workflow',
				active: false,
			});
		});

		it('should handle database errors gracefully', async () => {
			workflowRepository.findWorkflowsWithNodeType.mockRejectedValue(
				new Error('Database connection failed'),
			);

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.affectedWorkflows).toHaveLength(0);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to detect removed nodes',
				expect.objectContaining({
					error: expect.any(Error),
				}),
			);
		});
	});
});
