import type {
	AssignmentCollectionValue,
	FilterValue,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeParameterResourceLocator,
	INodeParameters,
	NodeConnectionType,
	NodeParameterValueType,
	OnError,
	ResourceMapperValue,
	StructuredChunk,
} from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Supported AI model providers
 */
export const chatHubLLMProviderSchema = z.enum(['openai', 'anthropic', 'google']);
export type ChatHubLLMProvider = z.infer<typeof chatHubLLMProviderSchema>;

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
};

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
	n8nModelSchema,
	chatAgentSchema,
]);

export type ChatHubOpenAIModel = z.infer<typeof openAIModelSchema>;
export type ChatHubAnthropicModel = z.infer<typeof anthropicModelSchema>;
export type ChatHubGoogleModel = z.infer<typeof googleModelSchema>;
export type ChatHubBaseLLMModel = ChatHubOpenAIModel | ChatHubAnthropicModel | ChatHubGoogleModel;

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

export interface ChatModelDto {
	model: ChatHubConversationModel;
	name: string;
	description: string | null;
	updatedAt: string | null;
	createdAt: string | null;
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
	n8n: { models: [] },
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'custom-agent': { models: [] },
};

export const NodeConnectionTypeSchema: z.ZodType<NodeConnectionType> = z.enum([
	'ai_agent',
	'ai_chain',
	'ai_document',
	'ai_embedding',
	'ai_languageModel',
	'ai_memory',
	'ai_outputParser',
	'ai_retriever',
	'ai_reranker',
	'ai_textSplitter',
	'ai_tool',
	'ai_vectorStore',
	'main',
]);

export const OnErrorSchema: z.ZodType<OnError> = z.enum([
	'continueErrorOutput',
	'continueRegularOutput',
	'stopWorkflow',
]);

export const INodeCredentialsDetailsSchema: z.ZodType<INodeCredentialsDetails> = z.object({
	id: z.string().nullable(),
	name: z.string(),
});

export const INodeCredentialsSchema: z.ZodType<INodeCredentials> = z.record(
	z.string(),
	INodeCredentialsDetailsSchema,
);

export const INodeParameterResourceLocatorSchema: z.ZodType<
	INodeParameterResourceLocator,
	z.ZodTypeDef,
	Omit<INodeParameterResourceLocator, 'value'> & {
		value?: string | number | null | undefined;
	}
> = z
	.object({
		__rl: z.literal(true),
		mode: z.string(),
		value: z.union([z.string(), z.number(), z.null()]).optional(),
		cachedResultName: z.string().optional(),
		cachedResultUrl: z.string().optional(),
		__regex: z.string().optional(),
	})
	.strict()
	.transform((obj) => {
		// Zod doesn't like optional undefined...
		if (!Object.prototype.hasOwnProperty.call(obj, 'value')) {
			return { ...obj, value: undefined };
		}
		return obj as INodeParameterResourceLocator;
	});

const NodeParamPrimitiveSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.undefined(),
]);

const ResourceMapperValueSchema = z.any() as unknown as z.ZodType<ResourceMapperValue>;
const FilterValueSchema = z.any() as unknown as z.ZodType<FilterValue>;
const AssignmentCollectionValueSchema = z.any() as unknown as z.ZodType<AssignmentCollectionValue>;

export const NodeParameterValueSchema: z.ZodType<NodeParameterValueType> = z.lazy(() =>
	z.union([
		NodeParamPrimitiveSchema,
		INodeParameterResourceLocatorSchema,
		ResourceMapperValueSchema,
		FilterValueSchema,
		AssignmentCollectionValueSchema,

		INodeParametersSchema,

		// only the shapes allowed by the TS union
		z.array(NodeParamPrimitiveSchema),
		z.array(INodeParametersSchema),
		z.array(INodeParameterResourceLocatorSchema),
		z.array(ResourceMapperValueSchema),
	]),
) as unknown as z.ZodType<NodeParameterValueType>; // cast keeps the exact output type

export const INodeParametersSchema: z.ZodType<INodeParameters> = z.record(
	z.string(),
	NodeParameterValueSchema,
);

export const INodeSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		typeVersion: z.number(),
		type: z.string(),
		position: z.tuple([z.number(), z.number()]),
		disabled: z.boolean().optional(),
		notes: z.string().optional(),
		notesInFlow: z.boolean().optional(),
		retryOnFail: z.boolean().optional(),
		maxTries: z.number().optional(),
		waitBetweenTries: z.number().optional(),
		alwaysOutputData: z.boolean().optional(),
		executeOnce: z.boolean().optional(),
		onError: OnErrorSchema.optional(),
		continueOnFail: z.boolean().optional(),
		webhookId: z.string().optional(),
		extendsCredential: z.string().optional(),
		rewireOutputLogTo: NodeConnectionTypeSchema.optional(),
		parameters: INodeParametersSchema,
		credentials: INodeCredentialsSchema.optional(),
		forceCustomOperation: z
			.object({
				resource: z.string(),
				operation: z.string(),
			})
			.optional(),
	})
	.strict();

export type INodeDto = z.infer<typeof INodeSchema>;

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
}) {}

export class ChatHubRegenerateMessageRequest extends Z.class({
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
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
}) {}

export class ChatHubUpdateConversationRequest extends Z.class({
	title: z.string().optional(),
	credentialId: z.string().max(36).optional(),
	provider: chatHubProviderSchema.optional(),
	model: z.string().max(64).optional(),
	workflowId: z.string().max(36).optional(),
	agentId: z.string().uuid().optional(),
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
	agentName: string | null;
	createdAt: string;
	updatedAt: string;
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
}

export type ChatHubConversationsResponse = ChatHubSessionDto[];

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
	systemPrompt: string;
	ownerId: string;
	credentialId: string | null;
	provider: ChatHubLLMProvider;
	model: string;
	createdAt: string;
	updatedAt: string;
}

export class ChatHubCreateAgentRequest extends Z.class({
	name: z.string().min(1).max(128),
	description: z.string().max(512).optional(),
	systemPrompt: z.string().min(1),
	credentialId: z.string(),
	provider: chatHubProviderSchema.exclude(['n8n', 'custom-agent']),
	model: z.string().max(64),
}) {}

export class ChatHubUpdateAgentRequest extends Z.class({
	name: z.string().min(1).max(128).optional(),
	description: z.string().max(512).optional(),
	systemPrompt: z.string().min(1).optional(),
	credentialId: z.string().optional(),
	provider: chatHubProviderSchema.optional(),
	model: z.string().max(64).optional(),
}) {}

export interface EnrichedStructuredChunk extends StructuredChunk {
	metadata: StructuredChunk['metadata'] & {
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		retryOfMessageId: ChatMessageId | null;
		executionId: number | null;
	};
}
