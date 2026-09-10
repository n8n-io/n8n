import { computed, type ComputedRef } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useAiGateway } from '@/app/composables/useAiGateway';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import {
	buildManagedCredentialValue,
	isNodeGatewayManaged,
} from '@/features/ai/gateway/utils/managedCredential';

import type { GatewayOpportunity } from './useWorkflowGatewayScan';

export interface ApplyGatewayCredentialResult {
	/** Node names switched to Gateway credits. */
	applied: string[];
	/** Node names that could not be switched. */
	failed: string[];
}

/**
 * Applies Gateway credits to nodes the scan already proved eligible.
 *
 * The write goes through the workflow document store with the default
 * `markDirty: true`, so the workflow stays dirty after the switch. The user
 * decides when to save, and can undo the change until then.
 */
export function useApplyGatewayCredential(): {
	canApply: ComputedRef<boolean>;
	applyToNodes: (opportunities: GatewayOpportunity[]) => ApplyGatewayCredentialResult;
} {
	const settingsStore = useSettingsStore();
	const aiGatewayStore = useAiGatewayStore();
	const aiGateway = useAiGateway();
	const sourceControlStore = useSourceControlStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsStore = useWorkflowsStore();

	const canApply = computed(() => {
		if (!settingsStore.isAiGatewayEnabled) return false;

		const document = workflowDocumentStore.value;
		// A workflow the user has not saved yet carries no scopes, so a permission
		// check reads it as read-only. It is the user's own uncommitted canvas, so
		// treat it as updatable. This is the state right after a workflow import.
		const isUnsaved = !workflowsStore.isWorkflowSaved[document.workflowId];
		const canUpdateWorkflow =
			isUnsaved || getResourcePermissions(document.scopes).workflow.update === true;
		if (!canUpdateWorkflow || document.isArchived) return false;

		if (sourceControlStore.preferences.branchReadOnly) return false;

		// `undefined` means the balance is not known yet, and must not block: only a
		// confirmed-empty wallet turns a working workflow into a broken one.
		const balance = aiGateway.balance.value;
		if (balance !== undefined && balance <= 0) return false;

		return true;
	});

	function applyToNodes(opportunities: GatewayOpportunity[]): ApplyGatewayCredentialResult {
		const applied: string[] = [];
		const failed: string[] = [];
		const document = workflowDocumentStore.value;

		for (const opportunity of opportunities) {
			const node = document.getNodeByName(opportunity.nodeName);
			if (!node) {
				failed.push(opportunity.nodeName);
				continue;
			}

			// The document may have changed since the scan ran, so re-check here rather
			// than trust the scan's result: never overwrite a slot another flow already
			// assigned.
			if (isNodeGatewayManaged(aiGatewayStore.hasGatewayManagedCredential, node)) {
				failed.push(opportunity.nodeName);
				continue;
			}

			const hasActivationParameters = Object.keys(opportunity.activationParameters).length > 0;

			document.updateNodeProperties({
				name: opportunity.nodeName,
				properties: {
					...(hasActivationParameters
						? { parameters: { ...node.parameters, ...opportunity.activationParameters } }
						: {}),
					credentials: {
						...node.credentials,
						[opportunity.credentialType]: buildManagedCredentialValue(),
					},
				},
			});

			applied.push(opportunity.nodeName);
		}

		return { applied, failed };
	}

	return { canApply, applyToNodes };
}
