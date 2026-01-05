import type { WorkflowRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

describe('WorkflowValidationService', () => {
	let service: WorkflowValidationService;
	let mockWorkflowRepository: ReturnType<typeof mock<WorkflowRepository>>;

	beforeEach(() => {
		mockWorkflowRepository = mock<WorkflowRepository>();
		service = new WorkflowValidationService(mockWorkflowRepository);
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

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
		});

		it('should return valid when all referenced sub-workflows are published', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' }),
				createExecuteWorkflowNode('Sub-workflow 2', { value: 'workflow-2' }),
			];

			mockWorkflowRepository.get.mockImplementation(
				async ({ id }) =>
					({
						id: id as string,
						name: `Workflow ${id}`,
						activeVersionId: 'version-id',
					}) as any,
			);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).toHaveBeenCalledTimes(2);
		});

		it('should return invalid when a referenced sub-workflow is not published', async () => {
			const nodes: INode[] = [createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' })];

			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Draft Workflow',
				activeVersionId: null,
			} as any);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

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

			mockWorkflowRepository.get.mockResolvedValue(null);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

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

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});

		it('should skip nodes using expressions for workflowId', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Expression Node', '={{ $json.workflowId }}'),
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
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

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});

		it('should validate nodes using database source', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Database Node', { value: 'workflow-1' }, { source: 'database' }),
			];

			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Workflow',
				activeVersionId: 'version-id',
			} as any);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-1' },
				{ relations: [] },
			);
		});

		it('should handle old node format with string workflowId', async () => {
			const nodes: INode[] = [createExecuteWorkflowNode('Old Format Node', 'workflow-1')];

			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Workflow',
				activeVersionId: 'version-id',
			} as any);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-1' },
				{ relations: [] },
			);
		});

		it('should collect all invalid references in a single validation', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' }),
				createExecuteWorkflowNode('Sub-workflow 2', { value: 'workflow-2' }),
				createExecuteWorkflowNode('Sub-workflow 3', { value: 'workflow-3' }),
			];

			mockWorkflowRepository.get.mockImplementation(async ({ id }) => {
				if (id === 'workflow-2') return null;
				return {
					id: id as string,
					name: id === 'workflow-3' ? 'Draft Workflow 3' : 'Workflow',
					activeVersionId: id === 'workflow-1' ? 'version-id' : null,
				} as any;
			});

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(false);
			expect(result.invalidReferences).toHaveLength(2);
			expect(result.error).toContain('workflow-2');
			expect(result.error).toContain('workflow-3');
		});

		it('should allow self-referencing workflows', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Self Reference', { value: 'parent-workflow-id' }),
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});
	});
});
