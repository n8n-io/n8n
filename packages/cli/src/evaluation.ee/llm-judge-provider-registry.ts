import { Service } from '@n8n/di';

export type ProviderCredentialType = {
	name: string;
	displayName: string;
};

export type ProviderEntry = {
	nodeType: string;
	displayName: string;
	credentialTypes: ProviderCredentialType[];
};

const PROVIDERS: ProviderEntry[] = [
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
		displayName: 'Alibaba Cloud Chat Model',
		credentialTypes: [{ name: 'alibabaCloudApi', displayName: 'Alibaba Cloud' }],
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

const PROVIDERS_BY_NODE_TYPE = new Map(PROVIDERS.map((p) => [p.nodeType, p]));

@Service()
export class LlmJudgeProviderRegistry {
	listProviders(): ProviderEntry[] {
		return PROVIDERS;
	}

	get(nodeType: string): ProviderEntry | undefined {
		return PROVIDERS_BY_NODE_TYPE.get(nodeType);
	}
}
