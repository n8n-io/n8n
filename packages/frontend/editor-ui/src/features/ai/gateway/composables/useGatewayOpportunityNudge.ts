import { h } from 'vue';
import type { INode } from 'n8n-workflow';

import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useAiGateway } from '@/app/composables/useAiGateway';
import { useWorkflowGatewayScan } from './useWorkflowGatewayScan';
import { useGatewayOpportunityNudgeStore } from '../stores/gatewayOpportunityNudge.store';
import GatewayOpportunityToastMessage from '../components/GatewayOpportunityToastMessage.vue';

/**
 * Shows a sticky toast, at most once per session, telling the user that some
 * nodes in the workflow they just ran manually could switch to Gateway
 * credits. Call this only after a manual run actually started: runWorkflow()
 * clears sticky notifications as it begins, which would wipe this toast.
 */
export async function maybeShowGatewayOpportunityNudge(
	nodes: INode[],
	workflowId: string,
): Promise<void> {
	const settingsStore = useSettingsStore();
	if (!settingsStore.isAiGatewayEnabled) return;

	// Only the node creator, the NDV credential rows and the agent components load
	// the gateway config. A user who runs a workflow without opening one of those
	// has no config, and the scan would find nothing. The fetch is cached and
	// shares one in-flight promise, so this is cheap.
	await useAiGateway().fetchConfig();

	const { scanNodes } = useWorkflowGatewayScan();
	const result = scanNodes(nodes);
	const opportunityCount = result.opportunities.length;

	const nudgeStore = useGatewayOpportunityNudgeStore();
	if (!nudgeStore.shouldShow(opportunityCount)) return;

	const i18n = useI18n();
	const toast = useToast();

	// eslint-disable-next-line prefer-const -- self-reference so the message can close its own toast
	let handle: NotificationHandle;
	handle = toast.showMessage({
		title: i18n.baseText('aiGateway.opportunityNudge.title'),
		message: h(GatewayOpportunityToastMessage, {
			opportunityCount,
			onDismiss: () => {
				handle?.close();
				void nudgeStore.dismiss(workflowId);
			},
			onNeverShowAgain: () => {
				handle?.close();
				void nudgeStore.neverShowAgain(workflowId);
			},
		}),
		type: 'info',
		duration: 0,
	});

	nudgeStore.markShown(opportunityCount, workflowId);
}
