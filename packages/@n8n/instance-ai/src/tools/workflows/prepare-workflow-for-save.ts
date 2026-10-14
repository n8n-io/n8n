import { dropInvalidWorkflowJsonGroups, type WorkflowJSON } from '@n8n/workflow-sdk';
import { makeGetNodeTypeForGrouping } from 'n8n-workflow';

import { preserveExistingNodePositions } from './preserve-node-positions';
import {
	ensureUniqueNodeIds,
	ensureWebhookIds,
	preserveExistingNodeGroupIds,
	preserveExistingNodeIds,
	preserveExistingSetupValues,
} from './workflow-json-utils';
import { nodeGroupDroppedWarnings } from './workflow-validation-warnings';
import type { InstanceAiContext } from '../../types';

/** Preserve saved identities and setup before preparing the canvas layout. */
export async function prepareWorkflowForSave(
	json: WorkflowJSON,
	workflowId: string | undefined,
	context: InstanceAiContext,
) {
	// The preservation passes use node IDs, so IDs must be unique first.
	ensureUniqueNodeIds(json);
	await preserveExistingNodeIds(json, workflowId, context);
	await preserveExistingSetupValues(json, workflowId, context);
	await ensureWebhookIds(json, workflowId, context);
	await preserveExistingNodeGroupIds(json, workflowId, context);

	const groupCountBeforeDrop = json.nodeGroups?.length ?? 0;
	const droppedGroupWarnings = nodeGroupDroppedWarnings(
		dropInvalidWorkflowJsonGroups(
			json,
			context.nodeTypesProvider ? makeGetNodeTypeForGrouping(context.nodeTypesProvider) : null,
		),
	);
	const droppedGroupCount = groupCountBeforeDrop - (json.nodeGroups?.length ?? 0);

	// Layout reads group membership after invalid groups are removed.
	await preserveExistingNodePositions(json, workflowId, context);

	return { groupCountBeforeDrop, droppedGroupCount, droppedGroupWarnings };
}
