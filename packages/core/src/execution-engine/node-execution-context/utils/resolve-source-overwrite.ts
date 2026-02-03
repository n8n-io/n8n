import type { IExecuteData, INodeExecutionData } from 'n8n-workflow';

/**
 * This method checks if preserveSourceOverwrite is enabled and if so, returns the source overwrite data.
 * If preservedSourceOverwrite is set, it returns that, otherwise looks for sourceOverwrite in the pairedItem.
 */
export function resolveSourceOverwrite(item: INodeExecutionData, executionData: IExecuteData) {
	const isToolExecution = !!executionData.metadata?.preserveSourceOverwrite;
	if (!isToolExecution) {
		return null;
	}
	if (executionData.metadata?.preservedSourceOverwrite) {
		return executionData.metadata.preservedSourceOverwrite;
	}
	if (typeof item.pairedItem === 'object' && 'sourceOverwrite' in item.pairedItem) {
		return item.pairedItem.sourceOverwrite;
	}
	return null;
}
