import type { ChatHubLLMProvider } from '@n8n/api-types';
import type { INodeTypeNameVersion } from 'n8n-workflow';

export const CONVERSATION_TITLE_GENERATION_PROMPT = `Generate a concise, descriptive title for this conversation based on the user's message.

Requirements:
- 3 to 5 words
- Use normal sentence case (not title case)
- No quotation marks
- Only output the title, nothing else
- Use the same language as the user's message
`;

export const PROVIDER_NODE_TYPE_MAP: Record<ChatHubLLMProvider, INodeTypeNameVersion> = {
	openai: {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		version: 1.2,
	},
	anthropic: {
		name: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		version: 1.3,
	},
	google: {
		name: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		version: 1.2,
	},
	ollama: {
		name: '@n8n/n8n-nodes-langchain.lmOllama',
		version: 1,
	},
	azureOpenAi: {
		name: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
		version: 1,
	},
};

export const NODE_NAMES = {
	CHAT_TRIGGER: 'When chat message received',
	REPLY_AGENT: 'AI Agent',
	TITLE_GENERATOR_AGENT: 'Title Generator Agent',
	CHAT_MODEL: 'Chat Model',
	MEMORY: 'Memory',
	RESTORE_CHAT_MEMORY: 'Restore Chat Memory',
	CLEAR_CHAT_MEMORY: 'Clear Chat Memory',
} as const;

/* eslint-disable @typescript-eslint/naming-convention */
export const JSONL_STREAM_HEADERS = {
	'Content-Type': 'application/json-lines; charset=utf-8',
	'Transfer-Encoding': 'chunked',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
};
/* eslint-enable @typescript-eslint/naming-convention */
