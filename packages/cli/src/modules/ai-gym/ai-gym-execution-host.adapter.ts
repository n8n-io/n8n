import { AiGymExecutionHostPort } from '@n8n/backend-module-ai-gym';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ExecutionLifecycleHooks } from 'n8n-core';
import type { INodeTypes, IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

/**
 * CLI-side adapter supplying n8n runtime dependencies (node types, additionalData,
 * workflow lookup, optional ephemeral push streaming) to `@n8n/backend-module-ai-gym`.
 *
 * Dependencies are resolved lazily via `Container.get` because `modules.manifest.ts`
 * registers this adapter during module loading, before the TypeORM `DataSource` is
 * initialized.
 */
@Service()
export class AiGymExecutionHostAdapter extends AiGymExecutionHostPort {
	getNodeTypes(): INodeTypes {
		return Container.get(NodeTypes);
	}

	async getBaseAdditionalData(params: {
		workflowData: IWorkflowBase;
		userId?: string;
		pushRef?: string;
	}): Promise<IWorkflowExecuteAdditionalData> {
		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			userId: params.userId,
			workflowId: params.workflowData.id,
			workflowSettings: params.workflowData.settings,
		});

		const executionId = `sim-${Date.now()}`;
		const hooks = new ExecutionLifecycleHooks('manual', executionId, params.workflowData);

		if (params.pushRef) {
			const push = Container.get(Push);
			const pushRef = params.pushRef;
			const userId = params.userId;
			let sequenceNumber = 0;

			hooks.addHandler('nodeExecuteBefore', (nodeName, data) => {
				push.send(
					{
						type: 'nodeExecuteBefore',
						data: { executionId, nodeName, sequenceNumber: sequenceNumber++, data },
					},
					pushRef,
					userId,
				);
			});

			hooks.addHandler('nodeExecuteAfter', (nodeName, data) => {
				const { data: _nodeData, ...taskData } = data;
				push.send(
					{
						type: 'nodeExecuteAfter',
						data: {
							executionId,
							nodeName,
							sequenceNumber: sequenceNumber++,
							data: taskData,
							itemCountByConnectionType: {},
						},
					},
					pushRef,
					userId,
				);
			});
		}

		additionalData.hooks = hooks;
		additionalData.executionId = executionId;

		return additionalData;
	}

	async loadWorkflowForUser(params: {
		workflowId: string;
		userId: string;
	}): Promise<IWorkflowBase | undefined> {
		const workflow = await Container.get(WorkflowRepository).get({ id: params.workflowId });
		return workflow ?? undefined;
	}
}
