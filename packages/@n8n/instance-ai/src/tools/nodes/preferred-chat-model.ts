import type { CredentialSummary } from '../../types';

/**
 * Maps an LLM-provider credential type to its chat model node and models.dev
 * provider id, ordered by the provider recommendation precedence. When the user
 * has credentials for several providers, the first match wins; with none, the
 * builder keeps its own default.
 *
 * Deliberately scoped to the recommended providers: chat-model nodes outside
 * this table (Azure OpenAI, OpenRouter, Groq, DeepSeek, Cohere, Ollama,
 * Bedrock, ...) get no steering, hints, or mismatch warnings. Extending it is
 * a recommendation decision, not just a lookup fix — keep the precedence order.
 */
export const CHAT_MODEL_BY_CREDENTIAL_TYPE: ReadonlyArray<{
	credentialType: string;
	nodeType: string;
	/** models.dev provider id used by `@n8n/agents/catalog`. */
	modelsDevProviderId: string;
}> = [
	{
		credentialType: 'anthropicApi',
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		modelsDevProviderId: 'anthropic',
	},
	{
		credentialType: 'openAiApi',
		nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		modelsDevProviderId: 'openai',
	},
	{
		credentialType: 'mistralCloudApi',
		nodeType: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
		modelsDevProviderId: 'mistral',
	},
	{
		credentialType: 'xAiApi',
		nodeType: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
		modelsDevProviderId: 'xai',
	},
	{
		credentialType: 'googlePalmApi',
		nodeType: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		modelsDevProviderId: 'google',
	},
];

export const CHAT_MODEL_NODE_TYPES: ReadonlySet<string> = new Set(
	CHAT_MODEL_BY_CREDENTIAL_TYPE.map((entry) => entry.nodeType),
);

/** Whether a node type corresponds to one of the recommended chat model nodes. */
export function isChatModelNode(nodeType: string | undefined): boolean {
	return nodeType !== undefined && CHAT_MODEL_NODE_TYPES.has(nodeType);
}

/**
 * Pick the chat model node for the provider the user already has a credential
 * for, following the recommendation precedence. Returns undefined when none of
 * the available credential types map to a supported chat model.
 */
export function pickPreferredChatModelNode(
	availableCredentialTypes: Iterable<string>,
): string | undefined {
	const available = new Set(availableCredentialTypes);
	for (const { credentialType, nodeType } of CHAT_MODEL_BY_CREDENTIAL_TYPE) {
		if (available.has(credentialType)) return nodeType;
	}
	return undefined;
}

/** Whether a credential type belongs to an LLM provider with a chat model node. */
export function isChatModelProviderCredentialType(credentialType: string): boolean {
	return CHAT_MODEL_BY_CREDENTIAL_TYPE.some((entry) => entry.credentialType === credentialType);
}

export function resolveChatModelCatalogEntry(
	nodeType: string | undefined,
): (typeof CHAT_MODEL_BY_CREDENTIAL_TYPE)[number] | undefined {
	if (!nodeType) return undefined;
	return CHAT_MODEL_BY_CREDENTIAL_TYPE.find((entry) => entry.nodeType === nodeType);
}

/**
 * Stored credentials of chat-model providers other than `excludedType`,
 * rendered `"name" (type, id: ...)` in recommendation precedence order.
 * Undefined when there is none.
 */
function listStoredChatModelAlternatives(
	excludedType: string,
	storedCredentials: readonly CredentialSummary[],
): string | undefined {
	const alternatives = CHAT_MODEL_BY_CREDENTIAL_TYPE.flatMap(({ credentialType }) =>
		credentialType === excludedType
			? []
			: storedCredentials.filter((cred) => cred.type === credentialType),
	);
	if (alternatives.length === 0) return undefined;
	return alternatives.map((cred) => `"${cred.name}" (${cred.type}, id: ${cred.id})`).join(', ');
}

/**
 * Hint for a credential listing filtered to an LLM-provider type that found no
 * stored credential: names the LLM-provider credentials the user does have, so
 * the builder prefers one of those providers (or asks) instead of locking in
 * its own default. Undefined when the requested type is not an LLM provider,
 * a stored credential of it exists, or there is no alternative to prefer.
 */
export function buildChatModelProviderHint(
	requestedType: string,
	storedCredentials: readonly CredentialSummary[],
): string | undefined {
	if (!isChatModelProviderCredentialType(requestedType)) return undefined;
	if (storedCredentials.some((cred) => cred.type === requestedType)) return undefined;

	const listed = listStoredChatModelAlternatives(requestedType, storedCredentials);
	if (!listed) return undefined;
	return (
		`No stored ${requestedType} credential exists, but the user already has LLM-provider credential(s): ${listed}. ` +
		`Unless the user explicitly asked for ${requestedType}, use a chat model from a provider they already have a credential for — or ask which provider to use.`
	);
}

/**
 * Deterministic post-build counterpart of `buildChatModelProviderHint` for
 * builders that never consult the credential list: one warning per chat-model
 * node whose provider has no stored credential while the user has one for
 * another provider. Nodes the resolver already covered with the n8n credits
 * managed credential are skipped — they run as built, so a rebuild directive
 * would be a false alarm. The decision to switch (or keep an explicitly
 * requested provider and ask) stays with the agent — only it can see the
 * user's intent.
 */
export function buildChatModelProviderMismatchWarnings(
	nodes: ReadonlyArray<{ name?: string; type?: string; disabled?: boolean }>,
	storedCredentials: readonly CredentialSummary[],
	resolvedCredentialsByNode: Record<
		string,
		ReadonlyArray<{ type: string; __aiGatewayManaged?: boolean }>
	> = {},
): string[] {
	const storedTypes = new Set(storedCredentials.map((cred) => cred.type));
	const warnings: string[] = [];
	for (const node of nodes) {
		if (node.disabled) continue;
		const entry = resolveChatModelCatalogEntry(node.type);
		if (!entry) continue;
		// Own-key check: a node named "constructor" or "__proto__" must not
		// resolve to an inherited Object.prototype member.
		const resolved =
			node.name && Object.hasOwn(resolvedCredentialsByNode, node.name)
				? resolvedCredentialsByNode[node.name]
				: undefined;
		if (resolved?.some((cred) => cred.__aiGatewayManaged)) continue;
		const { credentialType } = entry;
		if (storedTypes.has(credentialType)) continue;
		const listed = listStoredChatModelAlternatives(credentialType, storedCredentials);
		if (!listed) continue;
		warnings.push(
			`Node "${node.name ?? node.type}" uses ${node.type}, but no stored ${credentialType} credential exists. ` +
				`The user already has LLM-provider credential(s): ${listed}. ` +
				`Unless the user explicitly asked for ${credentialType}, rebuild with a chat model for a provider they already have a credential for — or ask which provider to use.`,
		);
	}
	return warnings;
}
