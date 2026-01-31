import type { WorkflowRepository } from '@n8n/db';
import type { ActiveWorkflows } from 'n8n-core';
import type { INode, IPinData, IWorkflowBase, Workflow } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { SingleTriggerError } from '@/errors/single-trigger.error';
import { TriggerParameterConflictError } from '@/errors/trigger-parameter-conflict.error';
import { TriggerValidationService } from '@/workflows/trigger-validation.service';

describe('TriggerValidationService', () => {
	let service: TriggerValidationService;
	let mockWorkflowRepository: ReturnType<typeof mock<WorkflowRepository>>;
	let mockActiveWorkflows: ReturnType<typeof mock<ActiveWorkflows>>;

	beforeEach(() => {
		mockWorkflowRepository = mock<WorkflowRepository>();
		mockActiveWorkflows = mock<ActiveWorkflows>();
		service = new TriggerValidationService(mockWorkflowRepository, mockActiveWorkflows);
	});

	const createKafkaTriggerNode = (
		name: string,
		groupId: string,
		options?: { disabled?: boolean },
	): INode => ({
		name,
		type: 'n8n-nodes-base.kafkaTrigger',
		id: `node-${name}`,
		typeVersion: 1,
		position: [0, 0],
		disabled: options?.disabled,
		parameters: { groupId },
	});

	const createRegularNode = (name: string): INode => ({
		name,
		type: 'n8n-nodes-base.set',
		id: `node-${name}`,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});

	const createWorkflowData = (
		id: string,
		nodes: INode[],
		options?: { pinData?: IPinData },
	): IWorkflowBase =>
		({
			id,
			name: `Workflow ${id}`,
			nodes,
			connections: {},
			active: false,
			pinData: options?.pinData,
		}) as IWorkflowBase;

	describe('validateManualExecution', () => {
		describe('checkTestRunAllowed', () => {
			it('should allow test run when workflow is not active', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'group-1'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([]);

				await expect(service.validateManualExecution(workflowData, false)).resolves.not.toThrow();
			});

			it('should throw SingleTriggerError when workflow is active with Kafka trigger', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'group-1'),
				]);

				await expect(service.validateManualExecution(workflowData, true)).rejects.toThrow(
					SingleTriggerError,
				);
			});

			it('should allow test run when Kafka trigger is disabled', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'group-1', { disabled: true }),
				]);

				mockWorkflowRepository.find.mockResolvedValue([]);

				await expect(service.validateManualExecution(workflowData, true)).resolves.not.toThrow();
			});

			it('should allow test run when Kafka trigger has pinned data', async () => {
				const workflowData = createWorkflowData(
					'workflow-1',
					[createKafkaTriggerNode('Kafka Trigger', 'group-1')],
					{ pinData: { 'Kafka Trigger': [{ json: { data: 'pinned' } }] } },
				);

				mockWorkflowRepository.find.mockResolvedValue([]);

				await expect(service.validateManualExecution(workflowData, true)).resolves.not.toThrow();
			});

			it('should throw SingleTriggerError for specific trigger when triggerToStartFrom is provided', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger 1', 'group-1'),
					createKafkaTriggerNode('Kafka Trigger 2', 'group-2'),
				]);

				await expect(
					service.validateManualExecution(workflowData, true, { name: 'Kafka Trigger 2' }),
				).rejects.toThrow(SingleTriggerError);
			});

			it('should allow test run when triggerToStartFrom is not a restricted trigger', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'group-1'),
					createRegularNode('Set Node'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([]);

				await expect(
					service.validateManualExecution(workflowData, true, { name: 'Set Node' }),
				).resolves.not.toThrow();
			});
		});

		describe('checkConflicts', () => {
			it('should not check conflicts when no triggers with unique parameters exist', async () => {
				const workflowData = createWorkflowData('workflow-1', [createRegularNode('Set Node')]);

				await service.validateManualExecution(workflowData, false);

				expect(mockWorkflowRepository.find).not.toHaveBeenCalled();
			});

			it('should throw TriggerParameterConflictError when groupId conflicts with active workflow', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'shared-group'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([
					{
						id: 'workflow-2',
						name: 'Active Workflow',
						active: true,
						activeVersion: {
							nodes: [createKafkaTriggerNode('Other Kafka', 'shared-group')],
						},
					} as any,
				]);

				await expect(service.validateManualExecution(workflowData, false)).rejects.toThrow(
					TriggerParameterConflictError,
				);
			});

			it('should not throw when groupId is different from active workflows', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'group-1'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([
					{
						id: 'workflow-2',
						name: 'Active Workflow',
						active: true,
						activeVersion: {
							nodes: [createKafkaTriggerNode('Other Kafka', 'group-2')],
						},
					} as any,
				]);

				await expect(service.validateManualExecution(workflowData, false)).resolves.not.toThrow();
			});

			it('should skip checking against the same workflow', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'group-1'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([
					{
						id: 'workflow-1',
						name: 'Same Workflow',
						active: true,
						activeVersion: {
							nodes: [createKafkaTriggerNode('Kafka Trigger', 'group-1')],
						},
					} as any,
				]);

				await expect(service.validateManualExecution(workflowData, false)).resolves.not.toThrow();
			});

			it('should skip disabled nodes in active workflows', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger', 'shared-group'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([
					{
						id: 'workflow-2',
						name: 'Active Workflow',
						active: true,
						activeVersion: {
							nodes: [createKafkaTriggerNode('Other Kafka', 'shared-group', { disabled: true })],
						},
					} as any,
				]);

				await expect(service.validateManualExecution(workflowData, false)).resolves.not.toThrow();
			});

			it('should only check specified trigger when triggerToStartFrom is provided', async () => {
				const workflowData = createWorkflowData('workflow-1', [
					createKafkaTriggerNode('Kafka Trigger 1', 'group-1'),
					createKafkaTriggerNode('Kafka Trigger 2', 'conflicting-group'),
				]);

				mockWorkflowRepository.find.mockResolvedValue([
					{
						id: 'workflow-2',
						name: 'Active Workflow',
						active: true,
						activeVersion: {
							nodes: [createKafkaTriggerNode('Other Kafka', 'conflicting-group')],
						},
					} as any,
				]);

				// Should not throw because we're only checking Kafka Trigger 1
				await expect(
					service.validateManualExecution(workflowData, false, { name: 'Kafka Trigger 1' }),
				).resolves.not.toThrow();
			});
		});
	});

	describe('validateWorkflowActivation', () => {
		const createWorkflow = (id: string, nodes: Record<string, INode>): Workflow =>
			({
				id,
				nodes,
			}) as unknown as Workflow;

		it('should not check conflicts when no triggers with unique parameters exist', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Set Node': createRegularNode('Set Node'),
			});

			await service.validateWorkflowActivation(workflow);

			expect(mockActiveWorkflows.allActiveWorkflows).not.toHaveBeenCalled();
		});

		it('should not check conflicts when no other active workflows exist', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Kafka Trigger': createKafkaTriggerNode('Kafka Trigger', 'group-1'),
			});

			mockActiveWorkflows.allActiveWorkflows.mockReturnValue(['workflow-1']);

			await service.validateWorkflowActivation(workflow);

			expect(mockWorkflowRepository.findById).not.toHaveBeenCalled();
		});

		it('should throw TriggerParameterConflictError when groupId conflicts with active workflow', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Kafka Trigger': createKafkaTriggerNode('Kafka Trigger', 'shared-group'),
			});

			mockActiveWorkflows.allActiveWorkflows.mockReturnValue(['workflow-1', 'workflow-2']);
			mockWorkflowRepository.findById.mockResolvedValue({
				id: 'workflow-2',
				name: 'Active Workflow',
				activeVersion: {
					nodes: [createKafkaTriggerNode('Other Kafka', 'shared-group')],
				},
			} as any);

			await expect(service.validateWorkflowActivation(workflow)).rejects.toThrow(
				TriggerParameterConflictError,
			);
		});

		it('should not throw when groupId is different from active workflows', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Kafka Trigger': createKafkaTriggerNode('Kafka Trigger', 'group-1'),
			});

			mockActiveWorkflows.allActiveWorkflows.mockReturnValue(['workflow-1', 'workflow-2']);
			mockWorkflowRepository.findById.mockResolvedValue({
				id: 'workflow-2',
				name: 'Active Workflow',
				activeVersion: {
					nodes: [createKafkaTriggerNode('Other Kafka', 'group-2')],
				},
			} as any);

			await expect(service.validateWorkflowActivation(workflow)).resolves.not.toThrow();
		});

		it('should skip workflows without activeVersion', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Kafka Trigger': createKafkaTriggerNode('Kafka Trigger', 'shared-group'),
			});

			mockActiveWorkflows.allActiveWorkflows.mockReturnValue(['workflow-1', 'workflow-2']);
			mockWorkflowRepository.findById.mockResolvedValue({
				id: 'workflow-2',
				name: 'Draft Workflow',
				activeVersion: null,
			} as any);

			await expect(service.validateWorkflowActivation(workflow)).resolves.not.toThrow();
		});

		it('should skip disabled nodes in the workflow being activated', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Kafka Trigger': createKafkaTriggerNode('Kafka Trigger', 'shared-group', {
					disabled: true,
				}),
			});

			mockActiveWorkflows.allActiveWorkflows.mockReturnValue(['workflow-1', 'workflow-2']);

			await service.validateWorkflowActivation(workflow);

			expect(mockWorkflowRepository.findById).not.toHaveBeenCalled();
		});

		it('should check multiple active workflows for conflicts', async () => {
			const workflow = createWorkflow('workflow-1', {
				'Kafka Trigger': createKafkaTriggerNode('Kafka Trigger', 'group-1'),
			});

			mockActiveWorkflows.allActiveWorkflows.mockReturnValue([
				'workflow-1',
				'workflow-2',
				'workflow-3',
			]);
			mockWorkflowRepository.findById.mockImplementation(async (id) => {
				if (id === 'workflow-2') {
					return {
						id: 'workflow-2',
						name: 'Active Workflow 2',
						activeVersion: {
							nodes: [createKafkaTriggerNode('Kafka 2', 'group-2')],
						},
					} as any;
				}
				return {
					id: 'workflow-3',
					name: 'Active Workflow 3',
					activeVersion: {
						nodes: [createKafkaTriggerNode('Kafka 3', 'group-3')],
					},
				} as any;
			});

			await expect(service.validateWorkflowActivation(workflow)).resolves.not.toThrow();
			expect(mockWorkflowRepository.findById).toHaveBeenCalledTimes(2);
		});
	});
});
