import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExecutionLifecycleHooks } from 'n8n-core';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import { ManualTrigger } from 'n8n-nodes-base/nodes/ManualTrigger/ManualTrigger.node';
import { NoOp } from 'n8n-nodes-base/nodes/NoOp/NoOp.node';
import type {
	INode,
	INodeType,
	INodeTypes,
	IRun,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createEmptyRunExecutionData, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { ManualExecutionService } from '@/manual-execution.service';
import { OwnershipService } from '@/services/ownership.service';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { WorkflowRunner } from '@/workflow-runner';

import { Execute } from '../execute';
import { ExecuteBatch } from '../execute-batch';

mockInstance(Logger);
const workflowRepository = mockInstance(WorkflowRepository);
const ownershipService = mockInstance(OwnershipService);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
mockInstance(EventService);
mockInstance(ShutdownService);
mockInstance(ModuleRegistry);
mockInstance(GlobalConfig, {
	executions: { mode: 'regular' },
	expressionEngine: { engine: 'legacy' },
	generic: { gracefulShutdownTimeout: 30 },
});

test.each(['execute', 'execute-batch'])(
	'%s runs the enabled branch when the subworkflow trigger is disabled',
	async (command) => {
		const nodes = [
			{ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{
				name: 'Execute Workflow Trigger',
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				disabled: true,
			},
			{ name: 'Manual Branch', type: 'n8n-nodes-base.noOp' },
			{ name: 'Subworkflow Branch', type: 'n8n-nodes-base.noOp' },
		].map<INode>((node, index) => ({
			...node,
			id: `node-${index}`,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			notes: '',
		}));
		const workflowData = mock<WorkflowEntity>({
			id: 'workflow-id',
			name: 'Disabled trigger workflow',
			nodes,
			connections: {
				'Manual Trigger': { main: [[{ node: 'Manual Branch', type: 'main', index: 0 }]] },
				'Execute Workflow Trigger': {
					main: [[{ node: 'Subworkflow Branch', type: 'main', index: 0 }]],
				},
			},
			settings: { executionOrder: 'v1' },
			pinData: undefined,
		});
		const owner = mock<User>({ id: 'owner-id' });
		workflowRepository.findOneBy.mockResolvedValue(workflowData);
		ownershipService.getInstanceOwner.mockResolvedValue(owner);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-id', name: 'Project' }),
		);
		workflowRunner.run.mockClear();
		workflowRunner.run.mockResolvedValue('execution-id');
		const completedRun: IRun = {
			mode: 'cli',
			status: 'success',
			storedAt: 'db',
			startedAt: new Date('2026-01-01T00:00:00Z'),
			stoppedAt: new Date('2026-01-01T00:00:01Z'),
			data: createEmptyRunExecutionData(),
		};
		activeExecutions.getPostExecutePromise.mockResolvedValue(completedRun);

		if (command === 'execute') {
			const cmd = new Execute();
			// @ts-expect-error Read-only property
			cmd.flags = { id: workflowData.id };
			await cmd.run();
		} else {
			ExecuteBatch.instanceOwner = owner;
			ExecuteBatch.cancelled = false;
			await new ExecuteBatch().startThread(workflowData);
		}

		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		const [runData] = workflowRunner.run.mock.calls[0];
		const nodeTypeRegistry: Record<string, INodeType> = {
			'n8n-nodes-base.manualTrigger': new ManualTrigger(),
			'n8n-nodes-base.executeWorkflowTrigger': new ExecuteWorkflowTrigger(),
			'n8n-nodes-base.noOp': new NoOp(),
		};
		const workflow = new Workflow({
			id: workflowData.id,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			settings: workflowData.settings,
			active: false,
			nodeTypes: mock<INodeTypes>({
				getByNameAndVersion: (name) => nodeTypeRegistry[name],
			}),
		});
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			hooks: new ExecutionLifecycleHooks('cli', 'execution-id', workflowData),
			currentNodeExecutionIndex: 0,
			executionId: 'execution-id',
			restartExecutionId: undefined,
			encryptedRunnerIdentity: undefined,
		});

		// Run the command payload through the real engine to check which branch executes.
		const run = await Container.get(ManualExecutionService).runManually(
			runData,
			workflow,
			additionalData,
			'execution-id',
		);

		expect(run.data.resultData.error).toBeUndefined();
		expect(run.status).toBe('success');
		expect(Object.keys(run.data.resultData.runData)).toEqual(['Manual Trigger', 'Manual Branch']);
	},
);
