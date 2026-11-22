import { AiGymExecutionHostPort } from '@n8n/backend-module-ai-gym';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ExecutionLifecycleHooks } from 'n8n-core';
import type { INodeTypes, IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

/**
 * CLI-side adapter supplying n8n runtime dependencies (node types, additionalData,
 * workflow lookup, optional ephemeral push streaming) to `@n8n/backend-module-ai-gym`.
 */
@Service()
export class AiGymExecutionHostAdapter extends AiGymExecutionHostPort {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly workflowRepository: WorkflowRepository,
		private readonly push: Push,
	) {
		super();
	}

	getNodeTypes(): INodeTypes {
		return this.nodeTypes;
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

		if (params.pushRef) {
			const executionId = `sim-${Date.now()}`;
			const hooks = new ExecutionLifecycleHooks('manual', executionId, params.workflowData);
			const pushRef = params.pushRef;
			const userId = params.userId;
			let sequenceNumber = 0;

			hooks.addHandler('nodeExecuteBefore', (nodeName, data) => {
				this.push.send(
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
				this.push.send(
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

			additionalData.hooks = hooks;
		}

		return additionalData;
	}

	async loadWorkflowForUser(params: {
		workflowId: string;
		userId: string;
	}): Promise<IWorkflowBase | undefined> {
		const workflow = await this.workflowRepository.get({ id: params.workflowId });
		return workflow ?? undefined;
	}
}
