import type { IWorkflowExecuteAdditionalData, VectorStoreHelperFunctions } from 'n8n-workflow';

export function getVectorStoreHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
): Partial<VectorStoreHelperFunctions> {
	const vectorStoreService = additionalData['vector-store']?.vectorStoreService;
	if (!vectorStoreService) return {};

	return {
		getVectorStoreService: () => vectorStoreService,
	};
}
