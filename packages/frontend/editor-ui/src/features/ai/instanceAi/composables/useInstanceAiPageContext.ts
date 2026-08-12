import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment, InstanceAiHandoffContext } from '@n8n/api-types';

import { VIEWS } from '@/app/constants';
import { useRouteWorkflowId } from '@/app/composables/useWorkflowId';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_VIEW,
	NEW_AGENT_VIEW,
} from '@/features/agents/constants';

import { buildInstanceAiCredentialHandoffContext } from './useInstanceAiHandoff';
import { handoffContextKey } from '../instanceAi.handoffContext';

export type PageContextChip = {
	key: string;
	label: string;
	icon: IconName;
	testId: string;
	tooltip?: string;
};

export const workflowPageChipKey = (id: string) => `workflow:${id}`;
export const agentPageChipKey = (id: string) => `agent:${id}`;

const WORKFLOW_CONTEXT_VIEWS = new Set<string>([
	VIEWS.WORKFLOW,
	VIEWS.EXECUTION_PREVIEW,
	VIEWS.EXECUTION_DEBUG,
	VIEWS.WORKFLOW_HISTORY,
]);

const AGENT_CONTEXT_VIEWS = new Set<string>([
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_VIEW,
	NEW_AGENT_VIEW,
]);

/**
 * Ambient page context for the floating Instance AI panel — the workflow,
 * credential, or agent the user is currently looking at. Shown as dismissible
 * chips and attached on send when still present.
 */
export function useInstanceAiPageContext() {
	const route = useRoute();
	const i18n = useI18n();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const workflowsListStore = useWorkflowsListStore();
	const routeWorkflowId = useRouteWorkflowId();

	const workflowAttachment = computed(
		(): Extract<InstanceAiAttachment, { type: 'workflow' }> | null => {
			if (!WORKFLOW_CONTEXT_VIEWS.has(String(route.name))) return null;

			const id = routeWorkflowId.value;
			if (!id || id === 'demo') return null;

			const name = workflowsListStore.getWorkflowById(id)?.name;
			const executionId = route.params.executionId;
			const resolvedExecutionId = Array.isArray(executionId) ? executionId[0] : executionId;

			return {
				type: 'workflow',
				id,
				...(name ? { name } : {}),
				...(typeof resolvedExecutionId === 'string' && resolvedExecutionId.length > 0
					? { executionId: resolvedExecutionId }
					: {}),
			};
		},
	);

	const agentAttachment = computed((): Extract<InstanceAiAttachment, { type: 'agent' }> | null => {
		if (!AGENT_CONTEXT_VIEWS.has(String(route.name))) return null;

		const agentId = route.params.agentId;
		const projectId = route.params.projectId;
		const id = Array.isArray(agentId) ? agentId[0] : agentId;
		const resolvedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
		if (!id || !resolvedProjectId) return null;

		return {
			type: 'agent',
			id,
			projectId: resolvedProjectId,
		};
	});

	const handoffContext = computed((): InstanceAiHandoffContext | null => {
		const modal = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
		if (!modal?.open || !modal.activeId) return null;

		if (modal.mode === 'edit') {
			const credential = credentialsStore.getCredentialById(modal.activeId);
			if (!credential) return null;
			return buildInstanceAiCredentialHandoffContext({
				credentialType: credential.type,
				displayName: credential.name,
				id: credential.id,
			});
		}

		if (modal.mode === 'new') {
			const credentialType = credentialsStore.getCredentialTypeByName(modal.activeId);
			if (!credentialType) return null;
			return buildInstanceAiCredentialHandoffContext({
				credentialType: credentialType.name,
				displayName: credentialType.displayName,
			});
		}

		return null;
	});

	const attachments = computed((): InstanceAiAttachment[] => {
		const next: InstanceAiAttachment[] = [];
		if (workflowAttachment.value) next.push(workflowAttachment.value);
		if (agentAttachment.value) next.push(agentAttachment.value);
		return next;
	});

	const chips = computed((): PageContextChip[] => {
		const next: PageContextChip[] = [];

		const workflow = workflowAttachment.value;
		if (workflow) {
			const name = workflow.name ?? i18n.baseText('instanceAi.proactive.context.workflow');
			next.push({
				key: workflowPageChipKey(workflow.id),
				label: name,
				icon: 'workflow',
				testId: 'instance-ai-floating-page-workflow-chip',
				tooltip: i18n.baseText('instanceAi.attachment.workflow.tooltip', {
					interpolate: { name },
				}),
			});
		}

		const agent = agentAttachment.value;
		if (agent) {
			const name = agent.name ?? i18n.baseText('instanceAi.attachment.agent.fallback');
			next.push({
				key: agentPageChipKey(agent.id),
				label: name,
				icon: 'robot',
				testId: 'instance-ai-floating-page-agent-chip',
				tooltip: i18n.baseText('instanceAi.attachment.agent.tooltip', {
					interpolate: { name },
				}),
			});
		}

		const credential = handoffContext.value;
		if (credential?.source === 'credential-modal') {
			next.push({
				key: handoffContextKey(credential),
				label: credential.credential.displayName,
				icon: 'key-round',
				testId: 'instance-ai-floating-page-credential-chip',
				tooltip: i18n.baseText('instanceAi.artifactsPanel.context.credentialModal'),
			});
		}

		return next;
	});

	return {
		attachments,
		handoffContext,
		chips,
	};
}
