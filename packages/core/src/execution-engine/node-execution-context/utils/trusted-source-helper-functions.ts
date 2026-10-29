import type { IWorkflowExecuteAdditionalData, TrustedSourceFunctions } from 'n8n-workflow';

/** Lets a node list trusted sources for a dropdown without touching DI. */
export function getTrustedSourceHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
): Partial<TrustedSourceFunctions> {
	const directory = additionalData['inbound-auth-core']?.trustedSourceDirectory;
	if (!directory) return {};
	return {
		listTrustedSources: async (filter) => await directory.listTrustedSources(filter),
	};
}
