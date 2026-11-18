import { toResourcePath } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { toAbsoluteUrl, useInstanceLocation } from '@n8n/frontend-module-page';
import { useI18n } from '@n8n/i18n';

import { usePagesWorkflowId } from './usePagesWorkflowId';

/**
 * Gives the "Copy link to node" action of the open workflow.
 * `copyNodeLink` puts the absolute URL of the node in the clipboard and confirms with a toast.
 * It does nothing until the workflow is saved, and when the page module is off.
 */
export function useNodeLinkCopy() {
	const i18n = useI18n();
	const toast = useToast();
	const clipboard = useClipboard();
	const workflowId = usePagesWorkflowId();
	const getInstanceLocation = useInstanceLocation();

	async function copyNodeLink(nodeId: string): Promise<void> {
		if (workflowId.value !== undefined) {
			const path = toResourcePath({
				resourceType: 'node',
				resourceId: nodeId,
				workflowId: workflowId.value,
			});
			await clipboard.copy(toAbsoluteUrl(path, getInstanceLocation()));
			toast.showMessage({ type: 'success', title: i18n.baseText('page.node.copyLink.copied') });
		}
	}

	return { copyNodeLink };
}
