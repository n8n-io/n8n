import { h } from 'vue';
import type { INode } from 'n8n-workflow';

import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { GATEWAY_OPPORTUNITY_SWITCH_MODAL_KEY } from '@/app/constants';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useUIStore } from '@/app/stores/ui.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useApplyGatewayCredential } from './useApplyGatewayCredential';
import { useWorkflowGatewayScan } from './useWorkflowGatewayScan';
import { useGatewayOpportunityNudgeStore } from '../stores/gatewayOpportunityNudge.store';
import GatewayOpportunityToastMessage from '../components/GatewayOpportunityToastMessage.vue';

/**
 * Shows a sticky toast, at most once for each workflow in a session, telling
 * the user that some nodes in this workflow could switch to Gateway credits.
 *
 * The scan runs here rather than when the workflow opens: the edit that brings
 * up this nudge is often the one that adds the eligible node, and a result
 * captured at open time would miss it.
 *
 * After a manual run, call this only once the run actually started: runWorkflow()
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
	// A caveated node is not safe to switch as-is, so it must not count toward
	// the headline ("N nodes could use Gateway credits"). The full list,
	// caveated nodes included, still reaches the modal once it opens.
	const opportunityCount = result.opportunities.filter((opportunity) => !opportunity.caveat).length;

	const nudgeStore = useGatewayOpportunityNudgeStore();
	if (!nudgeStore.shouldShow(opportunityCount, workflowId)) return;

	const { canApply } = useApplyGatewayCredential();
	const uiStore = useUIStore();
	// The NDV store is scoped to the document, not the workflow id.
	const ndvStore = useNDVStore(injectWorkflowDocumentStore().value.documentId);
	const i18n = useI18n();
	const toast = useToast();

	function showNudge(): void {
		// eslint-disable-next-line prefer-const -- self-reference so the message can close its own toast
		let handle: NotificationHandle;
		handle = toast.showMessage({
			title: i18n.baseText('aiGateway.opportunityNudge.title'),
			message: h(GatewayOpportunityToastMessage, {
				opportunityCount,
				canApply: canApply.value,
				onDismiss: () => {
					handle?.close();
					void nudgeStore.dismiss(workflowId);
				},
				onNeverShowAgain: () => {
					handle?.close();
					void nudgeStore.neverShowAgain(workflowId);
				},
				onReviewAndSwitch: () => {
					handle?.close();
					nudgeStore.actionReviewAndSwitch(workflowId, opportunityCount);
					uiStore.openModalWithData({
						name: GATEWAY_OPPORTUNITY_SWITCH_MODAL_KEY,
						data: { opportunities: result.opportunities, workflowId },
					});
				},
			}),
			type: 'info',
			duration: 0,
			// Keep `content-toast`, which positions the toast: customClass replaces the
			// default rather than merging. The second class widens this toast so the
			// three actions fit on one line.
			customClass: 'content-toast gateway-nudge-notification',
		});

		nudgeStore.markShown(opportunityCount, workflowId);
	}

	// The toast layers above the node details view, so it reads as an
	// interruption while the user configures a node. Show it on the canvas only;
	// nothing is marked as shown, so the caller retries when the view closes.
	if (ndvStore.isNDVOpen) return;

	showNudge();
}
