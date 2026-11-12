import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import {
	MAX_AGENT_CHAT_ATTACHMENT_BASE64_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
} from './agent-chat-attachments.constants';
import {
	AgentApprovalSchema,
	AgentTeamsSettingsSchema,
	WEBHOOK_INTEGRATION_TYPE,
	type AgentIntegrationConfig,
} from './agent-integration.schema';
import {
	AgentVectorStoreConfigSchema,
	AgentJsonConfigSchema,
	type AgentJsonConfig,
} from './agent-json-config.schema';
import type { AgentPersonalisation } from './agent-personalisation';
import {
	agentSkillAvailabilitySchema,
	agentSkillSchema,
	agentSkillShape,
	createAgentSkillSchema,
} from './agent-skill.schema';
import { agentTaskSchema } from './agent-task.schema';
import {
	AGENT_MEMORY_FILTER_SOURCES,
	AGENT_MEMORY_SOURCE_FACETS,
	N8N_CHAT_INTEGRATION_TYPE,
	type AgentSkill,
	type AgentSkillVersionInfo,
} from './types';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { booleanFromString } from '../schemas/boolean-from-string';
import { nullableObjectGuardSchema } from '../schemas/object-guard.schema';
import { threadTitleSearchSchema } from '../schemas/thread-title-search.schema';
import { Z } from '../zod-class';
import {
	workflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../schemas/workflow-version.schema';

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
	'awaiting',
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
	'webhook',
] as const;

export type AgentSessionStatus = (typeof AGENT_SESSION_STATUSES)[number];
export type AgentSessionOrigin = (typeof AGENT_SESSION_ORIGINS)[number];

const agentListFilterSchema = z
	.object({
		query: z.string().trim().min(1).max(128).optional(),
		ids: z.array(z.string().min(1)).min(1).max(50).optional(),
		availableInMCP: z.boolean().optional(),
		availableInChat: z.boolean().optional(),
		includeArchived: z.boolean().optional(),
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

export class ListAgentMemoryEntriesQueryDto extends Z.class({
	cursor: z.string().min(1).optional(),
	limit: z.string().optional(),
	source: z.enum(AGENT_MEMORY_FILTER_SOURCES).optional(),
	/** Narrows `source` to one user, channel or team. Requires `source` and `sourceFacetId`. */
	sourceFacet: z.enum(AGENT_MEMORY_SOURCE_FACETS).optional(),
	sourceFacetId: z.string().min(1).max(255).optional(),
}) {}

/** Cross-agent n8n Chat thread list: cursor + limit only, no status/origin/scope filters. */
export class ListN8nChatThreadsQueryDto extends Z.class({
	// The cursor is a thread's `updatedAt` ISO string (see `paginateByUpdatedAt`).
	cursor: z.string().datetime().optional(),
	limit: z.string().optional(),
	/** Filters threads to one agent. */
	agentId: z.string().min(1).max(128).optional(),
	search: threadTitleSearchSchema,
}) {}

/** The thread list of a system agent: one page, optionally filtered by title. */
export class ListSystemAgentThreadsQueryDto extends Z.class({
	// The `nextCursor` of the previous page. The route decodes it.
	cursor: z.string().max(512).optional(),
	limit: z.string().optional(),
	search: threadTitleSearchSchema,
}) {}

/** A new title for a thread of a system agent. */
export class RenameSystemAgentThreadDto extends Z.class({
	title: z.string().trim().min(1).max(255),
}) {}

/** A message to a system agent. `projectId` is the working project of a new session. */
export class SystemAgentChatQueryDto extends Z.class({
	projectId: z.string().min(1).max(128).optional(),
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

const createAgentShape = {
	name: z.string().min(1),
	id: clientMintedAgentIdSchema.optional(),
	config: z.record(z.unknown()).optional(),
	schema: AgentJsonConfigSchema.optional(),
	tools: z
		.record(
			z.object({ code: z.string(), descriptor: z.object({ name: z.string() }).passthrough() }),
		)
		.optional(),
	skills: z.record(agentSkillSchema).optional(),
};

const createAgentSchema = z
	.object(createAgentShape)
	.refine(({ config, schema }) => config === undefined || schema === undefined, {
		message: 'Use config for initial configuration or schema for duplication, not both.',
	});

type CreateAgent = z.infer<typeof createAgentSchema>;

export class CreateAgentDto implements CreateAgent {
	declare name: CreateAgent['name'];

	declare id?: CreateAgent['id'];

	declare config?: CreateAgent['config'];

	declare schema?: CreateAgent['schema'];

	declare tools?: CreateAgent['tools'];

	declare skills?: CreateAgent['skills'];

	static schema = createAgentSchema;

	constructor(data: CreateAgent) {
		Object.assign(this, createAgentSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return createAgentSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return createAgentSchema.parse(data);
	}
}

export class UpdateAgentConfigDto extends Z.class({
	config: z.record(z.unknown()),
	/** Hash of the config the edit was made against (`null` when the agent had none). */
	baseConfigHash: z.string().nullable(),
}) {}

function isPlainObject(value: unknown): boolean {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Stored configs predate the current write schema. A response check that
 * reused that schema would reject a saved row and turn GET into a 500.
 */
const agentConfigResponseSchema = nullableObjectGuardSchema<AgentJsonConfig>();

const agentProjectResponseSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.string(),
	})
	.nullable();

const agentActiveVersionResponseSchema = z
	.object({
		versionId: z.string(),
		integrations: z.array(z.custom<AgentIntegrationConfig>(isPlainObject)),
	})
	.nullable();

const agentToolEntrySchema = z.custom<{ code: string; descriptor: { name: string } }>(
	isPlainObject,
);

const agentPublicShape = {
	id: z.string(),
	name: z.string(),
	projectId: z.string(),
	project: agentProjectResponseSchema,
	availableInMCP: z.boolean(),
	isArchived: z.boolean(),
	versionId: z.string().nullable(),
	activeVersionId: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	config: agentConfigResponseSchema,
	configHash: z.string().nullable(),
	tools: z.record(agentToolEntrySchema),
	activeVersion: agentActiveVersionResponseSchema,
};

/** The draft, published, and latest version of each attached skill, keyed by skill id. */
const agentSkillVersionsSchema = z.record(z.custom<AgentSkillVersionInfo>(isPlainObject));

const agentBuilderStateShape = {
	isRunnable: z.boolean(),
	hasPublishHistory: z.boolean(),
	hasVersionHistory: z.boolean(),
	skills: z.record(z.custom<AgentSkill>(isPlainObject)),
	skillHashes: z.record(z.string()),
	outdatedSkillIds: z.array(z.string()),
	skillVersions: agentSkillVersionsSchema,
};

/** Fields a later public GET and PUT share. Builder-only state stays off this shape. */
export class AgentPublicDto extends Z.class(agentPublicShape) {}

/** Single-agent response. `config` is the document `PUT` writes back. */
export class AgentDto extends AgentPublicDto.extend(agentBuilderStateShape) {}

const agentListItemShape = {
	id: z.string(),
	name: z.string(),
	projectId: z.string(),
	project: agentProjectResponseSchema,
	availableInMCP: z.boolean(),
	isArchived: z.boolean(),
	versionId: z.string().nullable(),
	activeVersionId: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	personalisation: nullableObjectGuardSchema<AgentPersonalisation>(),
	/** `false` when the draft has no stored config. The list does not carry `config`. */
	hasConfig: z.boolean(),
	/**
	 * Present when the list attaches skill versions, so a card can flag
	 * skill-only changes without loading the agent.
	 */
	skillVersions: agentSkillVersionsSchema.optional(),
};

/**
 * Overview and project lists. `config` is omitted so a list row cannot be
 * sent as a full replace and drop skill refs the list never loaded.
 */
export class AgentListItemDto extends Z.class(agentListItemShape) {}

const strippedAgentField = z.unknown().optional();

const updateAgentObjectSchema = z
	.object({
		config: z.record(z.unknown()),
		baseConfigHash: z.string().nullable().optional(),
		configHash: z.string().nullable().optional(),
		id: strippedAgentField,
		name: strippedAgentField,
		projectId: strippedAgentField,
		project: strippedAgentField,
		availableInMCP: strippedAgentField,
		isArchived: strippedAgentField,
		versionId: strippedAgentField,
		activeVersionId: strippedAgentField,
		createdAt: strippedAgentField,
		updatedAt: strippedAgentField,
		tools: strippedAgentField,
		skills: strippedAgentField,
		skillHashes: strippedAgentField,
		outdatedSkillIds: strippedAgentField,
		skillVersions: strippedAgentField,
		isRunnable: strippedAgentField,
		hasPublishHistory: strippedAgentField,
		hasVersionHistory: strippedAgentField,
		activeVersion: strippedAgentField,
		adopted: strippedAgentField,
	})
	.strict();

const updateAgentSchema = updateAgentObjectSchema
	.superRefine((value, ctx) => {
		if (value.baseConfigHash === undefined && value.configHash === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'baseConfigHash or configHash is required',
				path: ['baseConfigHash'],
			});
		}
	})
	.transform(({ config, baseConfigHash, configHash }) => ({
		config,
		baseConfigHash: baseConfigHash !== undefined ? baseConfigHash : (configHash ?? null),
	}));

type UpdateAgent = z.infer<typeof updateAgentSchema>;

/**
 * Accepts a GET `AgentDto` or the editor body `{ config, baseConfigHash }`.
 * Server-managed fields are ignored. `configHash` is the concurrency token
 * when `baseConfigHash` is absent.
 */
export class UpdateAgentDto implements UpdateAgent {
	declare config: UpdateAgent['config'];

	declare baseConfigHash: UpdateAgent['baseConfigHash'];

	static schema = updateAgentSchema;

	constructor(data: z.input<typeof updateAgentObjectSchema>) {
		Object.assign(this, updateAgentSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return updateAgentSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return updateAgentSchema.parse(data);
	}
}

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

const updateAttachedAgentSkillShape = {
	...updateAgentSkillShape,
	availableTo: agentSkillAvailabilitySchema.optional(),
};

const updateAttachedAgentSkillSchema = z.object(updateAttachedAgentSkillShape).strict();

export class CreateAgentSkillDto extends Z.class(createAgentSkillSchema.shape) {
	static override schema = createAgentSkillSchema;

	constructor(data: z.infer<typeof createAgentSkillSchema>) {
		super(createAgentSkillSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return createAgentSkillSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return createAgentSkillSchema.parse(data);
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

export class UpdateAttachedAgentSkillDto extends Z.class(updateAttachedAgentSkillShape) {
	static override schema = updateAttachedAgentSkillSchema;

	constructor(data: z.infer<typeof updateAttachedAgentSkillSchema>) {
		super(updateAttachedAgentSkillSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return updateAttachedAgentSkillSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return updateAttachedAgentSkillSchema.parse(data);
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

/** Rules that every chat message DTO applies on top of its shape. */
const hasMessageContent = {
	check: (value: { message: string; attachments?: unknown[] }) =>
		value.message.trim().length > 0 || (value.attachments?.length ?? 0) > 0,
	options: { message: 'Message text or at least one attachment is required', path: ['message'] },
};
const hasSessionForMessageId = {
	check: (value: { sessionId?: string; messageId?: string }) =>
		!value.messageId || !!value.sessionId,
	options: { message: 'A session ID is required with a message ID', path: ['sessionId'] },
};

const agentChatMessageSchema = z
	.object(agentChatMessageShape)
	.refine(hasMessageContent.check, hasMessageContent.options)
	.refine(hasSessionForMessageId.check, hasSessionForMessageId.options);

/**
 * A UUID in canonical lowercase form. Use it where an id becomes part of a
 * case-insensitive name: two ids that differ only in case must not map to the
 * same name.
 */
export const lowercaseUuidSchema = z
	.string()
	.uuid()
	.refine((value) => value === value.toLowerCase(), { message: 'The UUID must be lowercase' });

/**
 * A system agent session ID is a lowercase UUID. System agents derive
 * resource names, such as sandbox names, from it.
 */
const systemAgentChatMessageShape = {
	...agentChatMessageShape,
	sessionId: lowercaseUuidSchema.optional(),
};

const systemAgentChatMessageSchema = z
	.object(systemAgentChatMessageShape)
	.refine(hasMessageContent.check, hasMessageContent.options)
	.refine(hasSessionForMessageId.check, hasSessionForMessageId.options);

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

/**
 * The chat message of a system agent. Same as {@link AgentChatMessageDto},
 * but the session ID must be a lowercase UUID. Validate via `parse`/`safeParse`,
 * for the same reason as `AgentChatMessageDto`.
 */
export class SystemAgentChatMessageDto extends Z.class(systemAgentChatMessageShape) {
	constructor(data: z.infer<typeof systemAgentChatMessageSchema>) {
		super(systemAgentChatMessageSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return systemAgentChatMessageSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return systemAgentChatMessageSchema.parse(data);
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

export class AgentTaskApprovalDto extends Z.class({
	toolCallId: z.string().min(1),
	resumeData: z.unknown(),
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
	replaces: z.object({ credentialId: z.string() }).optional(),
	/** Channel actions that need approval before they run. */
	approval: AgentApprovalSchema.optional(),
};

/**
 * Channels whose own config check decides whether the entry holds a
 * credential: n8n Chat never does, and a webhook does only for some
 * authentications.
 */
const CREDENTIAL_OPTIONAL_TYPES: ReadonlySet<string> = new Set([
	N8N_CHAT_INTEGRATION_TYPE,
	WEBHOOK_INTEGRATION_TYPE,
]);

/**
 * Envelope check for the connect body. The channel itself is validated against
 * the per-platform integration schema, which is where `settings` is checked.
 */
const agentConnectIntegrationSchema = z
	.object(agentConnectIntegrationShape)
	.refine(
		({ type, credentialId, replaces }) =>
			CREDENTIAL_OPTIONAL_TYPES.has(type) || (credentialId !== '' && replaces?.credentialId !== ''),
		{ message: 'credentialId is required for this channel', path: ['credentialId'] },
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

/**
 * Reaches Microsoft inside a URL path, so the shape is checked here rather than
 * escaped at each use: Microsoft issues these as GUIDs, and nothing else is a
 * legitimate value.
 */
const microsoftId = z.string().uuid();

/** Names the Microsoft sign-in the Entra app is registered with. */
export class AgentTeamsProvisionAppDto extends Z.class({
	managerCredentialId: z.string().min(1),
}) {}

/**
 * The Entra app the bot signs for is named explicitly because the bot is
 * created before the channel is connected, so the agent holds no credential yet.
 */
export class AgentTeamsProvisionBotDto extends Z.class({
	managerCredentialId: z.string().min(1),
	credentialId: z.string().min(1),
	subscriptionId: microsoftId,
}) {}

export class AgentTeamsPublishDto extends Z.class({
	managerCredentialId: z.string().min(1),
	credentialId: z.string().min(1),
	settings: AgentTeamsSettingsSchema.optional(),
}) {}

export class AgentDisconnectIntegrationDto extends Z.class({
	type: z.string().min(1),
	// Empty string targets a draft integration entry (`credentialId: ''`).
	credentialId: z.string(),
	deleteExternalResource: z.boolean().optional(),
}) {}

const agentVersionMetadataShape = {
	name: workflowVersionNameSchema.unwrap().trim().nullable().optional(),
	description: workflowVersionDescriptionSchema.nullable(),
};

export class UpdateAgentVersionDto extends Z.class(agentVersionMetadataShape) {}

export class PublishAgentDto extends Z.class({
	...agentVersionMetadataShape,
	versionId: z.string().min(1).optional(),
	/** The draft shown before confirmation. Omit when publishing a saved version. */
	draft: z
		.object({
			versionId: z.string().min(1),
			skillVersions: z.record(z.string(), z.number().int().positive()),
		})
		.optional(),
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

export class AgentChatCancelDto extends Z.class({
	scope: z.enum(['foreground', 'all']).optional(),
}) {}

export class AgentTaskCancellationDto extends Z.class({
	planId: z.string().uuid().toLowerCase().nullable(),
}) {}
