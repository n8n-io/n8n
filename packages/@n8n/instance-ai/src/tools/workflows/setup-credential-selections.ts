import {
	AI_GATEWAY_MANAGED_TAG,
	GENERIC_AUTH_CREDENTIAL_TYPES,
	instanceAiSetupCredentialAppliedKey,
	readPendingInstanceAiSetupCredentialSelections,
} from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	AI_GATEWAY_CREDENTIAL,
	N8N_CONNECT_DISPLAY_NAME,
	assignCredentialToNode,
} from './credential-utils';
import type { CredentialMap } from './resolve-credentials';
import type { ResolvedCredential } from './resolved-credential.schema';
import { isSetupPanelEnabled } from './setup-items';
import { getValidCredentialTypes } from './setup-workflow.service';
import { findWorkflowSourceFileBindingsForWorkflow } from './workflow-file-bindings';
import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

type PendingSelection = ReturnType<typeof readPendingInstanceAiSetupCredentialSelections>[number];

/** A repeated setup call must retain choices already saved during this run. */
export async function filterSatisfiedSetupCredentialTypes(
	context: InstanceAiContext,
	workflowId: string,
	credentialTypes: readonly string[] | undefined,
): Promise<readonly string[] | undefined> {
	if (!isSetupPanelEnabled(context) || !context.runId || !credentialTypes?.length)
		return credentialTypes;
	const bindings = await findWorkflowSourceFileBindingsForWorkflow(context, workflowId);
	const satisfied = new Set(
		bindings.flatMap(({ setupPreferences }) =>
			setupPreferences && setupPreferences.runId === context.runId
				? setupPreferences.satisfiedCredentialTypes
				: [],
		),
	);
	return credentialTypes.filter((type) => !satisfied.has(type));
}

export interface SetupCredentialSelectionResult {
	consumedSelections: PendingSelection[];
	unavailableCredentialTypes: string[];
	resolvedCredentialsByNode: Record<string, ResolvedCredential[]>;
}

/** Apply the user's latest choices before automatic credential resolution. */
export async function applyPendingSetupCredentialSelections(
	json: WorkflowJSON,
	workflowId: string | undefined,
	context: InstanceAiContext,
	credentialMap: CredentialMap,
): Promise<SetupCredentialSelectionResult> {
	const result: SetupCredentialSelectionResult = {
		consumedSelections: [],
		unavailableCredentialTypes: [],
		resolvedCredentialsByNode: {},
	};
	if (!isSetupPanelEnabled(context) || !workflowId || !context.threadId || !context.threadMemory) {
		return result;
	}
	const thread = await getThread(context.threadMemory, context.threadId);
	const selections = readPendingInstanceAiSetupCredentialSelections(thread?.metadata, workflowId);
	if (selections.length === 0) return result;

	const activeNodes = await Promise.all(
		json.nodes
			.filter((node) => !node.disabled && node.name)
			.map(async (node) => ({
				node,
				credentialTypes: await getValidCredentialTypes(context, node),
			})),
	);

	for (const pending of selections) {
		const { credentialType, credentialId, nodeNames } = pending.selection;
		const generic = GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType);
		const targets = activeNodes.filter(
			({ node, credentialTypes }) =>
				credentialTypes.has(credentialType) &&
				(nodeNames ? nodeNames.includes(node.name ?? '') : !generic),
		);
		if (targets.length === 0) {
			result.consumedSelections.push(pending);
			continue;
		}

		const stored = credentialMap.get(credentialType)?.find(({ id }) => id === credentialId);
		const gateway =
			credentialId === AI_GATEWAY_MANAGED_TAG &&
			(await context.credentialService.isAiGatewayCredentialType?.(credentialType));
		if (!stored && !gateway) {
			// Leave these slots open instead of substituting another account.
			for (const { node } of targets) {
				delete node.credentials?.[credentialType];
				if (node.name && result.resolvedCredentialsByNode[node.name]) {
					result.resolvedCredentialsByNode[node.name] = result.resolvedCredentialsByNode[
						node.name
					].filter((credential) => credential.type !== credentialType);
				}
			}
			result.unavailableCredentialTypes.push(credentialType);
			continue;
		}

		const credential = stored
			? { id: stored.id, name: stored.name }
			: { ...AI_GATEWAY_CREDENTIAL, name: N8N_CONNECT_DISPLAY_NAME };
		for (const { node } of targets) {
			if (!node.name) continue;
			assignCredentialToNode(node, credentialType, credential);
			result.resolvedCredentialsByNode[node.name] = [
				...(result.resolvedCredentialsByNode[node.name] ?? []).filter(
					(current) => current.type !== credentialType,
				),
				{ type: credentialType, ...credential },
			];
		}
		result.consumedSelections.push(pending);
	}
	return result;
}

/** Call only after the workflow save succeeds. */
export async function markSetupCredentialSelectionsApplied(
	context: InstanceAiContext,
	selections: readonly PendingSelection[],
): Promise<void> {
	if (!context.threadMemory || !context.threadId || selections.length === 0) return;
	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => {
				const updated = { ...metadata };
				for (const { itemId, selection } of selections) {
					updated[instanceAiSetupCredentialAppliedKey(itemId, selection.selectionId)] = true;
				}
				return { metadata: updated };
			},
		});
	} catch (error) {
		context.logger?.warn('Failed to mark setup credential selections as applied', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
