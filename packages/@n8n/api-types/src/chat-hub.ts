import {
	type StructuredChunk,
	type JINA_AI_TOOL_NODE_TYPE,
	type INode,
	INodeSchema,
} from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Supported AI model providers
 */
export const chatHubLLMProviderSchema = z.enum([
	'openai',
	'anthropic',
	'google',
	'azureOpenAi',
	'azureEntraId',
	'ollama',
	'awsBedrock',
	'vercelAiGateway',
	'xAiGrok',
	'groq',
	'openRouter',
	'deepSeek',
	'cohere',
	'mistralCloud',
]);
export type ChatHubLLMProvider = z.infer<typeof chatHubLLMProviderSchema>;

/**
 * Schema for icon or emoji representation
 */
export const agentIconOrEmojiSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('icon'),
		value: z.string(),
	}),
	z.object({
		type: z.literal('emoji'),
		value: z.string(),
	}),
]);
export type AgentIconOrEmoji = z.infer<typeof agentIconOrEmojiSchema>;

export const chatHubProviderSchema = z.enum([
	...chatHubLLMProviderSchema.options,
	'n8n',
	'custom-agent',
] as const);
export type ChatHubProvider = z.infer<typeof chatHubProviderSchema>;

/**
 * Map of providers to their credential types
 * Only LLM providers (openai, anthropic, google) have credentials
 */
export const PROVIDER_CREDENTIAL_TYPE_MAP: Record<
	Exclude<ChatHubProvider, 'n8n' | 'custom-agent'>,
	string
> = {
	openai: 'openAiApi',
	anthropic: 'anthropicApi',
	google: 'googlePalmApi',
	ollama: 'ollamaApi',
	azureOpenAi: 'azureOpenAiApi',
	azureEntraId: 'azureEntraCognitiveServicesOAuth2Api',
	awsBedrock: 'aws',
	vercelAiGateway: 'vercelAiGatewayApi',
	xAiGrok: 'xAiApi',
	groq: 'groqApi',
	openRouter: 'openRouterApi',
	deepSeek: 'deepSeekApi',
	cohere: 'cohereApi',
	mistralCloud: 'mistralCloudApi',
};

export type ChatHubAgentTool = typeof JINA_AI_TOOL_NODE_TYPE;

/**
 * Chat Hub conversation model configuration
 */
const openAIModelSchema = z.object({
	provider: z.literal('openai'),
	model: z.string(),
});

const anthropicModelSchema = z.object({
	provider: z.literal('anthropic'),
	model: z.string(),
});

const googleModelSchema = z.object({
	provider: z.literal('google'),
	model: z.string(),
});

const azureOpenAIModelSchema = z.object({
	provider: z.literal('azureOpenAi'),
	model: z.string(),
});

const azureEntraIdModelSchema = z.object({
	provider: z.literal('azureEntraId'),
	model: z.string(),
});

const ollamaModelSchema = z.object({
	provider: z.literal('ollama'),
	model: z.string(),
});

const awsBedrockModelSchema = z.object({
	provider: z.literal('awsBedrock'),
	model: z.string(),
});

const vercelAiGatewaySchema = z.object({
	provider: z.literal('vercelAiGateway'),
	model: z.string(),
});

const xAiGrokModelSchema = z.object({
	provider: z.literal('xAiGrok'),
	model: z.string(),
});

const groqModelSchema = z.object({
	provider: z.literal('groq'),
	model: z.string(),
});

const openRouterModelSchema = z.object({
	provider: z.literal('openRouter'),
	model: z.string(),
});

const deepSeekModelSchema = z.object({
	provider: z.literal('deepSeek'),
	model: z.string(),
});

const cohereModelSchema = z.object({
	provider: z.literal('cohere'),
	model: z.string(),
});

const mistralCloudModelSchema = z.object({
	provider: z.literal('mistralCloud'),
	model: z.string(),
});

const n8nModelSchema = z.object({
	provider: z.literal('n8n'),
	workflowId: z.string(),
});

const chatAgentSchema = z.object({
	provider: z.literal('custom-agent'),
	agentId: z.string(),
});

export const chatHubConversationModelSchema = z.discriminatedUnion('provider', [
	openAIModelSchema,
	anthropicModelSchema,
	googleModelSchema,
	azureOpenAIModelSchema,
	azureEntraIdModelSchema,
	ollamaModelSchema,
	awsBedrockModelSchema,
	vercelAiGatewaySchema,
	xAiGrokModelSchema,
	groqModelSchema,
	openRouterModelSchema,
	deepSeekModelSchema,
	cohereModelSchema,
	mistralCloudModelSchema,
	n8nModelSchema,
	chatAgentSchema,
]);

export type ChatHubOpenAIModel = z.infer<typeof openAIModelSchema>;
export type ChatHubAnthropicModel = z.infer<typeof anthropicModelSchema>;
export type ChatHubGoogleModel = z.infer<typeof googleModelSchema>;
export type ChatHubAzureOpenAIModel = z.infer<typeof azureOpenAIModelSchema>;
export type ChatHubAzureEntraIdModel = z.infer<typeof azureEntraIdModelSchema>;
export type ChatHubOllamaModel = z.infer<typeof ollamaModelSchema>;
export type ChatHubAwsBedrockModel = z.infer<typeof awsBedrockModelSchema>;
export type ChatHubVercelAiGatewayModel = z.infer<typeof vercelAiGatewaySchema>;
export type ChatHubXAiGrokModel = z.infer<typeof xAiGrokModelSchema>;
export type ChatHubGroqModel = z.infer<typeof groqModelSchema>;
export type ChatHubOpenRouterModel = z.infer<typeof openRouterModelSchema>;
export type ChatHubDeepSeekModel = z.infer<typeof deepSeekModelSchema>;
export type ChatHubCohereModel = z.infer<typeof cohereModelSchema>;
export type ChatHubMistralCloudModel = z.infer<typeof mistralCloudModelSchema>;
export type ChatHubBaseLLMModel =
	| ChatHubOpenAIModel
	| ChatHubAnthropicModel
	| ChatHubGoogleModel
	| ChatHubAzureOpenAIModel
	| ChatHubAzureEntraIdModel
	| ChatHubOllamaModel
	| ChatHubAwsBedrockModel
	| ChatHubVercelAiGatewayModel
	| ChatHubXAiGrokModel
	| ChatHubGroqModel
	| ChatHubOpenRouterModel
	| ChatHubDeepSeekModel
	| ChatHubCohereModel
	| ChatHubMistralCloudModel;

export type ChatHubN8nModel = z.infer<typeof n8nModelSchema>;
export type ChatHubCustomAgentModel = z.infer<typeof chatAgentSchema>;
export type ChatHubConversationModel = z.infer<typeof chatHubConversationModelSchema>;

/**
 * Request schema for fetching available chat models
 * Maps provider names to credential IDs (null if no credential available)
 */
export const chatModelsRequestSchema = z.object({
	credentials: z.record(chatHubProviderSchema, z.string().nullable()),
});

export type ChatModelsRequest = z.infer<typeof chatModelsRequestSchema>;

export type ChatHubInputModality = 'text' | 'image' | 'audio' | 'video' | 'file';

export interface ChatModelMetadataDto {
	inputModalities: ChatHubInputModality[];
	capabilities: {
		functionCalling: boolean;
	};
	available: boolean;
}

export interface ChatModelDto {
	model: ChatHubConversationModel;
	name: string;
	description: string | null;
	icon: AgentIconOrEmoji | null;
	updatedAt: string | null;
	createdAt: string | null;
	projectName: string | null;
	metadata: ChatModelMetadataDto;
}

/**
 * Response type for fetching available chat models
 */
export type ChatModelsResponse = Record<
	ChatHubProvider,
	{
		models: ChatModelDto[];
		error?: string;
	}
>;

export const emptyChatModelsResponse: ChatModelsResponse = {
	openai: { models: [] },
	anthropic: { models: [] },
	google: { models: [] },
	azureOpenAi: { models: [] },
	azureEntraId: { models: [] },
	ollama: { models: [] },
	awsBedrock: { models: [] },
	vercelAiGateway: { models: [] },
	xAiGrok: { models: [] },
	groq: { models: [] },
	openRouter: { models: [] },
	deepSeek: { models: [] },
	cohere: { models: [] },
	mistralCloud: { models: [] },
	n8n: { models: [] },
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'custom-agent': { models: [] },
};

/**
 * Chat attachment schema for incoming requests.
 * Requires base64 data and fileName.
 * MimeType, fileType, fileExtension, and fileSize are populated server-side.
 */
export const chatAttachmentSchema = z.object({
	data: z.string(),
	mimeType: z.string(),
	fileName: z.string(),
});

export const isValidTimeZone = (tz: string): boolean => {
	try {
		// Throws if invalid timezone
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
};

export const StrictTimeZoneSchema = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[A-Za-z0-9_/+-]+$/)
	.refine(isValidTimeZone, {
		message: 'Unknown or invalid time zone',
	});

export const TimeZoneSchema = StrictTimeZoneSchema.optional().catch(undefined);

export type ChatAttachment = z.infer<typeof chatAttachmentSchema>;

export class ChatHubSendMessageRequest extends Z.class({
	messageId: z.string().uuid(),
	sessionId: z.string().uuid(),
	message: z.string(),
	model: chatHubConversationModelSchema,
	previousMessageId: z.string().uuid().nullable(),
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
	tools: z.array(INodeSchema),
	attachments: z.array(chatAttachmentSchema),
	timeZone: TimeZoneSchema,
}) {}

export class ChatHubRegenerateMessageRequest extends Z.class({
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
	timeZone: TimeZoneSchema,
}) {}

export class ChatHubEditMessageRequest extends Z.class({
	message: z.string(),
	messageId: z.string().uuid(),
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
	timeZone: TimeZoneSchema,
}) {}

export class ChatHubUpdateConversationRequest extends Z.class({
	title: z.string().optional(),
	credentialId: z.string().max(36).optional(),
	model: chatHubConversationModelSchema.optional(),
	tools: z.array(INodeSchema).optional(),
}) {}

export type ChatHubMessageType = 'human' | 'ai' | 'system' | 'tool' | 'generic';
export type ChatHubMessageStatus = 'success' | 'error' | 'running' | 'cancelled';

export type ChatSessionId = string; // UUID
export type ChatMessageId = string; // UUID

export interface ChatHubSessionDto {
	id: ChatSessionId;
	title: string;
	ownerId: string;
	lastMessageAt: string | null;
	credentialId: string | null;
	provider: ChatHubProvider | null;
	model: string | null;
	workflowId: string | null;
	agentId: string | null;
	agentName: string;
	agentIcon: AgentIconOrEmoji | null;
	createdAt: string;
	updatedAt: string;
	tools: INode[];
}

export interface ChatHubMessageDto {
	id: ChatMessageId;
	sessionId: ChatSessionId;
	type: ChatHubMessageType;
	name: string;
	content: string;
	provider: ChatHubProvider | null;
	model: string | null;
	workflowId: string | null;
	agentId: string | null;
	executionId: number | null;
	status: ChatHubMessageStatus;
	createdAt: string;
	updatedAt: string;

	previousMessageId: ChatMessageId | null;
	retryOfMessageId: ChatMessageId | null;
	revisionOfMessageId: ChatMessageId | null;

	attachments: Array<{ fileName?: string; mimeType?: string }>;
}

export class ChatHubConversationsRequest extends Z.class({
	limit: z.coerce.number().int().min(1).max(100),
	cursor: z.string().uuid().optional(),
}) {}

export interface ChatHubConversationsResponse {
	data: ChatHubSessionDto[];
	nextCursor: string | null;
	hasMore: boolean;
}

export interface ChatHubConversationDto {
	messages: Record<ChatMessageId, ChatHubMessageDto>;
}

export interface ChatHubConversationResponse {
	session: ChatHubSessionDto;
	conversation: ChatHubConversationDto;
}

export interface ChatHubAgentDto {
	id: string;
	name: string;
	description: string | null;
	icon: AgentIconOrEmoji;
	systemPrompt: string;
	ownerId: string;
	credentialId: string | null;
	provider: ChatHubLLMProvider;
	model: string;
	tools: INode[];
	createdAt: string;
	updatedAt: string;
}

export class ChatHubCreateAgentRequest extends Z.class({
	name: z.string().min(1).max(128),
	description: z.string().max(512).optional(),
	icon: agentIconOrEmojiSchema,
	systemPrompt: z.string().min(1),
	credentialId: z.string(),
	provider: chatHubLLMProviderSchema,
	model: z.string().max(64),
	tools: z.array(INodeSchema),
}) {}

export class ChatHubUpdateAgentRequest extends Z.class({
	name: z.string().min(1).max(128).optional(),
	description: z.string().max(512).optional(),
	icon: agentIconOrEmojiSchema.optional(),
	systemPrompt: z.string().min(1).optional(),
	credentialId: z.string().optional(),
	provider: chatHubProviderSchema.optional(),
	model: z.string().max(64).optional(),
	tools: z.array(INodeSchema).optional(),
}) {}

export interface EnrichedStructuredChunk extends StructuredChunk {
	metadata: StructuredChunk['metadata'] & {
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		retryOfMessageId: ChatMessageId | null;
		executionId: number | null;
	};
}

const chatProviderSettingsSchema = z.object({
	provider: chatHubLLMProviderSchema,
	enabled: z.boolean().optional(),
	credentialId: z.string().nullable(),
	// Empty list = all models allowed
	allowedModels: z.array(
		z.object({
			displayName: z.string(),
			model: z.string(),
			isManual: z.boolean().optional(),
		}),
	),
	createdAt: z.string(),
	updatedAt: z.string().nullable(),
});

export type ChatProviderSettingsDto = z.infer<typeof chatProviderSettingsSchema>;

export class UpdateChatSettingsRequest extends Z.class({
	payload: chatProviderSettingsSchema,
}) {}
