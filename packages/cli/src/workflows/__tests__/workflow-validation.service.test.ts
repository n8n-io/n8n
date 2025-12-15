import type { INode } from 'n8n-workflow';

import {
	WorkflowValidationService,
	type WorkflowStatus,
} from '@/workflows/workflow-validation.service';

describe('WorkflowValidationService', () => {
	let service: WorkflowValidationService;

	beforeEach(() => {
		service = new WorkflowValidationService();
	});

	describe('validateSubWorkflowReferences', () => {
		const createExecuteWorkflowNode = (
			name: string,
			workflowId: string | { value: string },
			options?: { disabled?: boolean; source?: string },
		): INode => ({
			name,
			type: 'n8n-nodes-base.executeWorkflow',
			id: `node-${name}`,
			typeVersion: 1,
			position: [0, 0],
			disabled: options?.disabled,
			parameters: {
				workflowId,
				...(options?.source && { source: options.source }),
			},
		});

		it('should return valid when no executeWorkflow nodes exist', async () => {
			const nodes: INode[] = [
				{
					name: 'Set',
					type: 'n8n-nodes-base.set',
					id: 'node-1',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = await service.validateSubWorkflowReferences(nodes, async () => ({
				exists: true,
				isPublished: true,
			}));

			expect(result.isValid).toBe(true);
		});

		it('should return valid when all referenced sub-workflows are published', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' }),
				createExecuteWorkflowNode('Sub-workflow 2', { value: 'workflow-2' }),
			];

			const getWorkflowStatus = jest.fn(
				async (workflowId: string): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: true,
					name: `Workflow ${workflowId}`,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(true);
			expect(getWorkflowStatus).toHaveBeenCalledTimes(2);
		});

		it('should return invalid when a referenced sub-workflow is not published', async () => {
			const nodes: INode[] = [createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' })];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: false,
					name: 'Draft Workflow',
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Node "Sub-workflow 1" references workflow workflow-1');
			expect(result.error).toContain('("Draft Workflow")');
			expect(result.error).toContain('which is not published');
			expect(result.invalidReferences).toHaveLength(1);
			expect(result.invalidReferences?.[0]).toEqual({
				nodeName: 'Sub-workflow 1',
				workflowId: 'workflow-1',
				workflowName: 'Draft Workflow',
			});
		});

		it('should return invalid when a referenced sub-workflow does not exist', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'non-existent' }),
			];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: false,
					isPublished: false,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(false);
			expect(result.invalidReferences?.[0]).toEqual({
				nodeName: 'Sub-workflow 1',
				workflowId: 'non-existent',
				workflowName: undefined,
			});
		});

		it('should skip disabled executeWorkflow nodes', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Disabled Node', { value: 'workflow-1' }, { disabled: true }),
			];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: false,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(true);
			expect(getWorkflowStatus).not.toHaveBeenCalled();
		});

		it('should skip nodes using expressions for workflowId', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Expression Node', '={{ $json.workflowId }}'),
			];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: false,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(true);
			expect(getWorkflowStatus).not.toHaveBeenCalled();
		});

		it('should skip nodes using non-database sources', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('URL Node', { value: 'workflow-1' }, { source: 'url' }),
				createExecuteWorkflowNode(
					'Parameter Node',
					{ value: 'workflow-2' },
					{ source: 'parameter' },
				),
				createExecuteWorkflowNode(
					'LocalFile Node',
					{ value: 'workflow-3' },
					{ source: 'localFile' },
				),
			];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: false,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(true);
			expect(getWorkflowStatus).not.toHaveBeenCalled();
		});

		it('should validate nodes using database source', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Database Node', { value: 'workflow-1' }, { source: 'database' }),
			];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: true,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(true);
			expect(getWorkflowStatus).toHaveBeenCalledWith('workflow-1');
		});

		it('should handle old node format with string workflowId', async () => {
			const nodes: INode[] = [createExecuteWorkflowNode('Old Format Node', 'workflow-1')];

			const getWorkflowStatus = jest.fn(
				async (): Promise<WorkflowStatus> => ({
					exists: true,
					isPublished: true,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(true);
			expect(getWorkflowStatus).toHaveBeenCalledWith('workflow-1');
		});

		it('should collect all invalid references in a single validation', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' }),
				createExecuteWorkflowNode('Sub-workflow 2', { value: 'workflow-2' }),
				createExecuteWorkflowNode('Sub-workflow 3', { value: 'workflow-3' }),
			];

			const getWorkflowStatus = jest.fn(
				async (workflowId: string): Promise<WorkflowStatus> => ({
					exists: workflowId !== 'workflow-2',
					isPublished: workflowId === 'workflow-1',
					name: workflowId === 'workflow-3' ? 'Draft Workflow 3' : undefined,
				}),
			);

			const result = await service.validateSubWorkflowReferences(nodes, getWorkflowStatus);

			expect(result.isValid).toBe(false);
			expect(result.invalidReferences).toHaveLength(2);
			expect(result.error).toContain('workflow-2');
			expect(result.error).toContain('workflow-3');
		});
	});
});
