import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
	const schemaPreviewStore = useSchemaPreviewStore();

	useExecutionDataStore(createExecutionDataId(pushData.executionId)).updateNodeExecutionRunData(
		pushData,
	);

	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
