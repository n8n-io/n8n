import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useSettingsStore } from '@/app/stores/settings.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { PushPayload } from '@n8n/api-types';
import { TelemetryHelpers } from 'n8n-workflow';

export function useTrackNodeExecution() {
	const telemetry = useTelemetry();
	const workflowHelpers = useWorkflowHelpers();
	const settingsStore = useSettingsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	async function trackNodeExecution(pushData: PushPayload<'nodeExecuteAfter'>): Promise<void> {
		const nodeName = pushData.nodeName;

		if (!pushData.data.error) {
			return;
		}

		const node = workflowDocumentStore.value.getNodeByName(nodeName);

		telemetry.track('Manual exec errored', {
			error_title: pushData.data.error.message,
			node_type: node?.type,
			node_type_version: node?.typeVersion,
			node_id: node?.id,
			node_graph_string: JSON.stringify(
				TelemetryHelpers.generateNodesGraph(
					workflowDocumentStore.value.serialize(),
					workflowHelpers.getNodeTypes(),
					{
						isCloudDeployment: settingsStore.isCloudDeployment,
					},
				).nodeGraph,
			),
		});
	}

	return { trackNodeExecution };
}
