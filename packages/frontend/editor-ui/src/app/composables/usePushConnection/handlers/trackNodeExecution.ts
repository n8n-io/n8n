import type { PushPayload } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { TelemetryHelpers } from 'n8n-workflow';

export async function trackNodeExecution(
	pushData: PushPayload<'nodeExecuteAfter'>,
	workflowId: string,
): Promise<void> {
	const nodeName = pushData.nodeName;

	if (pushData.data.error) {
		const telemetry = useTelemetry();
		const workflowHelpers = useWorkflowHelpers();
		const settingsStore = useSettingsStore();
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		const node = workflowDocumentStore.getNodeByName(nodeName);
		telemetry.track('Manual exec errored', {
			error_title: pushData.data.error.message,
			node_type: node?.type,
			node_type_version: node?.typeVersion,
			node_id: node?.id,
			node_graph_string: JSON.stringify(
				TelemetryHelpers.generateNodesGraph(
					workflowDocumentStore.serialize(),
					workflowHelpers.getNodeTypes(),
					{
						isCloudDeployment: settingsStore.isCloudDeployment,
					},
				).nodeGraph,
			),
		});
	}
}
