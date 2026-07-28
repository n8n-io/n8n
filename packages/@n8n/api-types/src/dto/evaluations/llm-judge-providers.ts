// Single source of truth for the LLM-judge providers a config-based eval can
// use. The provider is the LangChain chat-model node type; each maps to the
// credential type(s) that select it. Both the backend registry
// (`LlmJudgeProviderRegistry`) and the config DTO schema derive from this list,
// so supported providers never drift between validation and runtime.

export type ProviderCredentialType = {
	name: string;
	displayName: string;
};

export type LlmJudgeProvider = {
	/** LangChain chat-model node type, e.g. `@n8n/n8n-nodes-langchain.lmChatOpenAi`. */
	nodeType: string;
	displayName: string;
	/** Credential types that select this provider (unique per provider). */
	credentialTypes: ProviderCredentialType[];
};

export const LLM_JUDGE_PROVIDERS: LlmJudgeProvider[] = [
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		displayName: 'OpenAI Chat Model',
		credentialTypes: [{ name: 'openAiApi', displayName: 'OpenAI' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		displayName: 'Anthropic Chat Model',
		credentialTypes: [{ name: 'anthropicApi', displayName: 'Anthropic' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		displayName: 'Google Gemini Chat Model',
		credentialTypes: [{ name: 'googlePalmApi', displayName: 'Google Gemini (PaLM) API' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatGoogleVertex',
		displayName: 'Google Vertex Chat Model',
		credentialTypes: [{ name: 'googleApi', displayName: 'Google Service Account' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
		displayName: 'Azure OpenAI Chat Model',
		credentialTypes: [
			{ name: 'azureOpenAiApi', displayName: 'Azure OpenAI' },
			{
				name: 'azureEntraCognitiveServicesOAuth2Api',
				displayName: 'Azure Entra (Cognitive Services)',
			},
		],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
		displayName: 'AWS Bedrock Chat Model',
		credentialTypes: [{ name: 'aws', displayName: 'AWS' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatOllama',
		displayName: 'Ollama Chat Model',
		credentialTypes: [{ name: 'ollamaApi', displayName: 'Ollama' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway',
		displayName: 'Vercel AI Gateway Chat Model',
		credentialTypes: [{ name: 'vercelAiGatewayApi', displayName: 'Vercel AI Gateway' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
		displayName: 'xAI Grok Chat Model',
		credentialTypes: [{ name: 'xAiApi', displayName: 'xAI' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatGroq',
		displayName: 'Groq Chat Model',
		credentialTypes: [{ name: 'groqApi', displayName: 'Groq' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
		displayName: 'OpenRouter Chat Model',
		credentialTypes: [{ name: 'openRouterApi', displayName: 'OpenRouter' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
		displayName: 'DeepSeek Chat Model',
		credentialTypes: [{ name: 'deepSeekApi', displayName: 'DeepSeek' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatCohere',
		displayName: 'Cohere Chat Model',
		credentialTypes: [{ name: 'cohereApi', displayName: 'Cohere' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
		displayName: 'Mistral Cloud Chat Model',
		credentialTypes: [{ name: 'mistralCloudApi', displayName: 'Mistral Cloud' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAlibabaCloud',
		displayName: 'Qwen Cloud Chat Model',
		credentialTypes: [{ name: 'alibabaCloudApi', displayName: 'Qwen Cloud' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatMinimax',
		displayName: 'MiniMax Chat Model',
		credentialTypes: [{ name: 'minimaxApi', displayName: 'MiniMax' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatMoonshot',
		displayName: 'Moonshot Kimi Chat Model',
		credentialTypes: [{ name: 'moonshotApi', displayName: 'Moonshot' }],
	},
	{
		nodeType: '@n8n/n8n-nodes-langchain.lmChatLemonade',
		displayName: 'Lemonade Chat Model',
		credentialTypes: [{ name: 'lemonadeApi', displayName: 'Lemonade' }],
	},
];

/** Chat-model node types accepted as a config-eval judge provider. */
export const LLM_JUDGE_PROVIDER_NODE_TYPES = LLM_JUDGE_PROVIDERS.map((p) => p.nodeType) as [
	string,
	...string[],
];
