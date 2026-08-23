import type { CredentialCheckProxyFunctions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

export function getCredentialCheckHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
): Partial<CredentialCheckProxyFunctions> {
	const credentialCheckProxy = additionalData['dynamic-credentials']?.credentialCheckProxy;
	if (!credentialCheckProxy) return {};
	return {
		checkCredentialStatus: async (workflowId, executionContext) =>
			await credentialCheckProxy.checkCredentialStatus(workflowId, executionContext),
	};
}
