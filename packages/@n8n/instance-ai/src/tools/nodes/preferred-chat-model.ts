/**
 * Maps an LLM-provider credential type to its chat model node, ordered by the
 * provider recommendation precedence. When the user has credentials for several
 * providers, the first match wins; with none, the builder keeps its own default.
 */
const CHAT_MODEL_BY_CREDENTIAL_TYPE: ReadonlyArray<[credentialType: string, nodeType: string]> = [
	['anthropicApi', '@n8n/n8n-nodes-langchain.lmChatAnthropic'],
	['openAiApi', '@n8n/n8n-nodes-langchain.lmChatOpenAi'],
	['mistralCloudApi', '@n8n/n8n-nodes-langchain.lmChatMistralCloud'],
	['xAiApi', '@n8n/n8n-nodes-langchain.lmChatXAiGrok'],
	['googlePalmApi', '@n8n/n8n-nodes-langchain.lmChatGoogleGemini'],
];

/**
 * Pick the chat model node for the provider the user already has a credential
 * for, following the recommendation precedence. Returns undefined when none of
 * the available credential types map to a supported chat model.
 */
export function pickPreferredChatModelNode(
	availableCredentialTypes: Iterable<string>,
): string | undefined {
	const available = new Set(availableCredentialTypes);
	for (const [credentialType, nodeType] of CHAT_MODEL_BY_CREDENTIAL_TYPE) {
		if (available.has(credentialType)) return nodeType;
	}
	return undefined;
}
