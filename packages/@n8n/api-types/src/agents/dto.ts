import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import {
	MAX_AGENT_CHAT_ATTACHMENT_BASE64_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
} from './agent-chat-attachments.constants';
import { AgentApprovalSchema, AgentTeamsSettingsSchema } from './agent-integration.schema';
import { AgentVectorStoreConfigSchema, AgentJsonConfigSchema } from './agent-json-config.schema';
import { agentSkillSchema, agentSkillShape } from './agent-skill.schema';
import { agentTaskSchema } from './agent-task.schema';
import { N8N_CHAT_INTEGRATION_TYPE } from './types';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { booleanFromString } from '../schemas/boolean-from-string';
import { threadTitleSearchSchema } from '../schemas/thread-title-search.schema';
import { Z } from '../zod-class';

export class AgentsSettingsDto extends Z.class({
	enabled: z.boolean(),
}) {}

export const AGENTS_LIST_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
	// Ranks by the requesting user's n8n Chat thread count per agent. Only the
	// chat-filtered list supplies usage counts; other consumers of this sort
	// option fall back to createdAt desc.
	'usage:desc',
] as const;

export const AGENT_SESSION_STATUSES = [
	'running',
	'succeeded',
	'error',
	'cancelled',
	'interrupted',
] as const;

export const AGENT_SESSION_ORIGINS = [
	'preview',
	'instance-ai',
	'mcp',
	'sub-agent',
	'schedule',
	'workflow',
	'n8n_chat_production',
	'slack',
	'telegram',
	'linear',
	'discord',
	'whatsapp',
	'teams',
] as const;

export type AgentSessionStatus = (typeof AGENT_SESSION_STATUSES)[number];
export type AgentSessionOrigin = (typeof AGENT_SESSION_ORIGINS)[number];

const agentListFilterSchema = z
	.object({
		query: z.string().trim().min(1).max(128).optional(),
		availableInMCP: z.boolean().optional(),
		availableInChat: z.boolean().optional(),
	})
	.strict();

const agentListFilterValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (!val) return undefined;

		try {
			const result = agentListFilterSchema.safeParse(jsonParse(val));
			if (!result.success) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid filter fields',
					path: ['filter'],
				});
				return z.NEVER;
			}
			return result.data;
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid filter format',
				path: ['filter'],
			});
			return z.NEVER;
		}
	});

export class ListAgentsQueryDto extends Z.class({
	...paginationSchema,
	filter: agentListFilterValidator,
	sortBy: z.enum(AGENTS_LIST_SORT_OPTIONS).optional(),
}) {}

export class ListAgentSessionsQueryDto extends Z.class({
	cursor: z.string().optional(),
	limit: z.string().optional(),
	previewOnly: booleanFromString.optional(),
	status: z.enum(AGENT_SESSION_STATUSES).optional(),
	origin: z.enum(AGENT_SESSION_ORIGINS).optional(),
	/** `mine` keeps only the sessions the requesting user owns. */
	scope: z.enum(['all', 'mine']).optional(),
	updatedAfter: z.coerce.date().optional(),
	updatedBefore: z.coerce.date().optional(),
}) {}

export type AgentSessionQueryFilters = Pick<
	ListAgentSessionsQueryDto,
	'status' | 'origin' | 'scope' | 'updatedAfter' | 'updatedBefore' | 'previewOnly'
>;

/** Cross-agent n8n Chat thread list: cursor + limit only, no status/origin/scope filters. */
export class ListN8nChatThreadsQueryDto extends Z.class({
	// The cursor is a thread's `updatedAt` ISO string (see `paginateByUpdatedAt`).
	cursor: z.string().datetime().optional(),
	limit: z.string().optional(),
	/** Filters threads to one agent. */
	agentId: z.string().min(1).max(128).optional(),
	search: threadTitleSearchSchema,
}) {}

export class AgentProviderModelsQueryDto extends Z.class({
	credentialId: z.string().min(1).max(64).optional(),
}) {}

/**
 * Target selector for bulk-toggling agents' MCP availability. Exactly one of
 * `agentIds`, `projectId`, or `allAgents` must be provided (mirrors the
 * workflows equivalent, `UpdateWorkflowsAvailabilityDto`).
 */
export class UpdateAgentsMcpAvailabilityDto extends Z.class({
	availableInMCP: z.boolean(),
	agentIds: z.array(z.string().min(1)).min(1).max(100).optional(),
	projectId: z.string().min(1).optional(),
	allAgents: z.literal(true).optional(),
}) {}

/**
 * Client-minted agent id, so a surface can reference the agent (an artifact tab,
 * a thread binding) before it decides to persist it. Matches the nanoid shape the
 * entity would otherwise generate.
 */
export const clientMintedAgentIdSchema = z.string().regex(/^[0-9A-Za-z]{16}$/);

export class CreateAgentDto extends Z.class({
	name: z.string().min(1),
	id: clientMintedAgentIdSchema.optional(),
	schema: AgentJsonConfigSchema.optional(),
	tools: z
		.record(
			z.object({ code: z.string(), descriptor: z.object({ name: z.string() }).passthrough() }),
		)
		.optional(),
	skills: z.record(agentSkillSchema).optional(),
}) {}

export class UpdateAgentConfigDto extends Z.class({
	config: z.record(z.unknown()),
	/** Hash of the config the edit was made against (`null` when the agent had none). */
	baseConfigHash: z.string().nullable(),
}) {}

export class CreateAgentTaskDto extends Z.class({
	name: agentTaskSchema.shape.name,
	objective: agentTaskSchema.shape.objective,
	cronExpression: agentTaskSchema.shape.cronExpression,
	timezone: agentTaskSchema.shape.timezone,
	// Seeds the config ref's enabled flag; the task body itself has no enabled.
	enabled: z.boolean().optional().default(true),
}) {}

export class UpdateAgentTaskDto extends Z.class({
	name: agentTaskSchema.shape.name.optional(),
	objective: agentTaskSchema.shape.objective.optional(),
	cronExpression: agentTaskSchema.shape.cronExpression.optional(),
	// `null` explicitly resets the task to the instance timezone.
	timezone: agentTaskSchema.shape.timezone,
}) {}

const updateAgentSkillShape = {
	name: agentSkillShape.name.optional(),
	description: agentSkillShape.description.optional(),
	instructions: agentSkillShape.instructions.optional(),
	allowedTools: agentSkillShape.allowedTools.optional(),
	references: agentSkillShape.references.optional(),
	baseSkillHash: z.string().optional(),
};

const updateAgentSkillSchema = z.object(updateAgentSkillShape).strict();

export class CreateAgentSkillDto extends Z.class(agentSkillShape) {
	static override schema = agentSkillSchema;

	constructor(data: z.infer<typeof agentSkillSchema>) {
		super(agentSkillSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return agentSkillSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return agentSkillSchema.parse(data);
	}
}

export class UpdateAgentSkillDto extends Z.class(updateAgentSkillShape) {
	static override schema = updateAgentSkillSchema;

	constructor(data: z.infer<typeof updateAgentSkillSchema>) {
		super(updateAgentSkillSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return updateAgentSkillSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return updateAgentSkillSchema.parse(data);
	}
}

export const agentChatAttachmentSchema = z.object({
	fileName: z.string().min(1).max(MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH),
	mimeType: z.string().min(1).max(MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH),
	// Base64; cap sized so the decoded payload stays within the size limit.
	data: z
		.string()
		.min(1)
		.max(
			MAX_AGENT_CHAT_ATTACHMENT_BASE64_LENGTH,
			`Attachment exceeds ${MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB} MB limit`,
		),
});

export type AgentChatAttachmentPayload = z.infer<typeof agentChatAttachmentSchema>;

const agentChatMessageShape = {
	// `message` may be empty when at least one attachment is present
	// (attachment-only sends) — see the schema-level refinement below.
	message: z.string(),
	sessionId: z.string().min(1).optional(),
	messageId: z.string().uuid().optional(),
	newSession: z.literal(true).optional(),
	attachments: z
		.array(agentChatAttachmentSchema)
		.max(MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE)
		.optional(),
	/**
	 * Per-message context from the client (for example the user's time zone).
	 * The Agents layer does not read it. A system agent's provider defines its
	 * shape and validates it. Project agents ignore it.
	 */
	clientContext: z.record(z.unknown()).optional(),
};

const agentChatMessageSchema = z
	.object(agentChatMessageShape)
	.refine((value) => value.message.trim().length > 0 || (value.attachments?.length ?? 0) > 0, {
		message: 'Message text or at least one attachment is required',
		path: ['message'],
	})
	.refine((value) => !value.messageId || !!value.sessionId, {
		message: 'A session ID is required with a message ID',
		path: ['sessionId'],
	});

/**
 * Validate via `parse`/`safeParse` (what the controller registry's `@Body`
 * middleware calls) — they apply the refined schema. The inherited `schema`
 * static cannot hold the refinement (a `ZodEffects` is not assignable to the
 * base class's `ZodObject`) and misses the text-or-attachment invariant.
 */
export class AgentChatMessageDto extends Z.class(agentChatMessageShape) {
	constructor(data: z.infer<typeof agentChatMessageSchema>) {
		super(agentChatMessageSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return agentChatMessageSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return agentChatMessageSchema.parse(data);
	}
}

export class AgentChatQueueUpdateDto extends Z.class({
	message: z.string(),
}) {}

export class AgentChatQueueSteerDto extends Z.class({
	executionId: z.string().min(1).max(36),
}) {}

export class AgentChatQueueReorderDto extends Z.class({
	targetQueueId: z.string().regex(/^[1-9]\d*$/),
	expectedQueueIds: z.array(z.string().regex(/^[1-9]\d*$/)).min(2),
}) {}

export class AgentChatResumeDto extends Z.class({
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
	// Deliberately untyped at this boundary: the possible resume shapes overlap
	// (e.g. credential's `{approved}` matches questions' `{approved, answers}`
	// and a non-discriminated union would parse against whichever member
	// matches first, silently stripping fields the "wrong" schema doesn't
	// know about). Each interactive tool validates its own resume payload via
	// `.resume(schema)`.
	resumeData: z.unknown(),
}) {}

const agentConnectIntegrationShape = {
	type: z.string().min(1),
	credentialId: z.string(),
	/**
	 * Credential of the same type this channel takes over from. Swapping in one
	 * request keeps the agent from ever holding two live channels or none.
	 */
	replaces: z.object({ credentialId: z.string().min(1) }).optional(),
	/** Channel actions that need approval before they run. */
	approval: AgentApprovalSchema.optional(),
};

/**
 * Envelope check for the connect body. The channel itself is validated against
 * the per-platform integration schema, which is where `settings` is checked.
 * n8n Chat is the one channel without a credential, so it takes an empty `credentialId`.
 */
const agentConnectIntegrationSchema = z
	.object(agentConnectIntegrationShape)
	.refine(
		(value) =>
			value.type === N8N_CHAT_INTEGRATION_TYPE
				? value.credentialId === ''
				: value.credentialId.length > 0,
		{ message: 'credentialId is required, except for n8n Chat', path: ['credentialId'] },
	);

export class AgentConnectIntegrationDto extends Z.class(agentConnectIntegrationShape) {
	constructor(data: z.infer<typeof agentConnectIntegrationSchema>) {
		super(agentConnectIntegrationSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return agentConnectIntegrationSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return agentConnectIntegrationSchema.parse(data);
	}
}

/**
 * The package is downloaded in the setup before the channel is connected, so
 * the settings it must reflect exist only in the open form. Without them the
 * first zip would ship the defaults whatever the user chose.
 */
export class AgentTeamsPackageDto extends Z.class({
	credentialId: z.string().min(1).optional(),
	settings: AgentTeamsSettingsSchema.optional(),
}) {}

export class AgentDisconnectIntegrationDto extends Z.class({
	type: z.string().min(1),
	// Empty string targets a draft integration entry (`credentialId: ''`).
	credentialId: z.string(),
	deleteExternalResource: z.boolean().optional(),
}) {}

export class PublishAgentDto extends Z.class({
	versionId: z.string().min(1).optional(),
}) {}

export class RevertAgentToVersionDto extends Z.class({
	versionId: z.string().min(1),
}) {}

export class TestAgentVectorStoreDto extends Z.class({
	vectorStore: AgentVectorStoreConfigSchema,
}) {}

export interface VectorStoreTestResult {
	success: boolean;
	message?: string;
	warning?: string;
}
