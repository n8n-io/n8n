import { useRouter } from 'vue-router';
import { v4 as uuid } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { AGENT_DECISION_TRIGGER_NODE_TYPE } from '@n8n/api-types';
import { NO_OP_NODE_TYPE, VIEWS } from '@/app/constants';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

export function useCreateApprovalWorkflow() {
	const router = useRouter();
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowList = useWorkflowsListStore();
	return async (projectId: string, agentName?: string) => {
		const tab = window.open('', '_blank');
		try {
			const triggerId = uuid();
			const triggerName = i18n.baseText('agents.hitl.workflowRequestNodeName');
			const placeholder: INodeUi = {
				id: uuid(),
				name: i18n.baseText('nodeView.replaceMe'),
				type: NO_OP_NODE_TYPE,
				typeVersion: 1,
				position: [256, 0],
				parameters: {},
				placeholder: true,
			};
			const responseName = i18n.baseText('agents.hitl.workflowResponseNodeName');
			const name = agentName ?? i18n.baseText('agents.hitl.unnamedAgent');
			const existing = await workflowList.searchWorkflows({
				projectId,
				select: ['name'],
			});
			let workflowNumber = 1;
			const workflowName = (value: number) =>
				i18n.baseText('agents.hitl.workflowDefaultName', {
					interpolate: { agent: name, number: String(value) },
				});
			while (existing.some((workflow) => workflow.name === workflowName(workflowNumber)))
				workflowNumber++;
			const workflow = await workflowsStore.createNewWorkflow({
				name: workflowName(workflowNumber),
				projectId,
				nodes: [
					{
						id: triggerId,
						name: triggerName,
						type: AGENT_DECISION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					placeholder,
					{
						id: uuid(),
						name: responseName,
						type: 'n8n-nodes-base.agentDecisionResponse',
						typeVersion: 1,
						position: [512, 0],
						parameters: { approved: false },
					},
				],
				connections: {
					[triggerName]: {
						main: [[{ node: placeholder.name, type: 'main', index: 0 }]],
					},
					[placeholder.name]: {
						main: [[{ node: responseName, type: 'main', index: 0 }]],
					},
				},
			});
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId: workflow.id },
			});
			if (tab) {
				tab.opener = null;
				tab.location.href = href;
			} else window.open(href, '_blank');
			return workflow;
		} catch (error) {
			tab?.close();
			throw error;
		}
	};
}
