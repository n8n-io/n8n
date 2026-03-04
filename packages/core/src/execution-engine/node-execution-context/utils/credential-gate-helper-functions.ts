import type { CredentialGateProxyFunctions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

export function getCredentialGateHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
): Partial<CredentialGateProxyFunctions> {
	const credentialGateProxy = additionalData['dynamic-credentials']?.credentialGateProxy;
	if (!credentialGateProxy) return {};
	return {
		checkCredentialGate: async (workflowId, executionContext) =>
			await credentialGateProxy.checkCredentialGate(workflowId, executionContext),
	};
}
