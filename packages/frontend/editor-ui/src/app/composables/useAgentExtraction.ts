import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useToast } from './useToast';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import { extractAgentFromWorkflow } from '@/features/agents/composables/useAgentApi';

const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

/**
 * Promote an in-workflow Agent node to a first-class Agent on the Agents
 * page. Walks the Agent node's `ai_*` sub-graph on the backend, maps it into
 * an `AgentJsonConfig`, and creates a new Agent in the workflow's project.
 *
 * The source workflow is not modified — this is a copy operation.
 */
export function useAgentExtraction() {
	const rootStore = useRootStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const toast = useToast();
	const i18n = useI18n();
	const router = useRouter();

	async function extractAgent(nodeId: string): Promise<void> {
		const node = workflowDocumentStore?.value?.getNodeById(nodeId);
		if (!node) {
			toast.showError(
				new Error(i18n.baseText('agentExtraction.error.nodeNotFound')),
				i18n.baseText('agentExtraction.error.failure'),
			);
			return;
		}

		if (node.type !== AGENT_NODE_TYPE) {
			toast.showError(
				new Error(i18n.baseText('agentExtraction.error.notAnAgent')),
				i18n.baseText('agentExtraction.error.failure'),
			);
			return;
		}

		const projectId = workflowDocumentStore?.value?.homeProject?.id;
		const workflowId = workflowDocumentStore?.value?.workflowId;
		if (!projectId || !workflowId) {
			toast.showError(
				new Error(i18n.baseText('agentExtraction.error.missingProject')),
				i18n.baseText('agentExtraction.error.failure'),
			);
			return;
		}

		try {
			const { agent, warnings } = await extractAgentFromWorkflow(
				rootStore.restApiContext,
				projectId,
				{ workflowId, nodeName: node.name },
			);

			const { href } = router.resolve({
				name: AGENT_BUILDER_VIEW,
				params: { projectId, agentId: agent.id },
			});

			// Warning list appended below the open-link so users see both at once.
			const warningsBlock = warnings.length
				? `<br><br>${warnings.map((w) => `&middot; ${escapeHtml(w.message)}`).join('<br>')}`
				: '';

			toast.showMessage({
				title: i18n.baseText('agentExtraction.success.title'),
				message:
					i18n.baseText('agentExtraction.success.message', {
						interpolate: { url: href },
					}) + warningsBlock,
				type: warnings.length ? 'warning' : 'success',
				duration: 12 * 1000,
			});
		} catch (e) {
			toast.showError(e, i18n.baseText('agentExtraction.error.failure'));
		}
	}

	return { extractAgent };
}

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
