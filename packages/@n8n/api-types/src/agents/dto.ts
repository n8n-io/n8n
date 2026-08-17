import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import {
	MAX_AGENT_CHAT_ATTACHMENT_BASE64_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
} from './agent-chat-attachments.constants';
import { AgentVectorStoreConfigSchema } from './agent-json-config.schema';
import { agentSkillSchema, agentSkillShape } from './agent-skill.schema';
import { agentTaskSchema } from './agent-task.schema';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { Z } from '../zod-class';

export const AGENTS_LIST_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
] as const;

const agentListFilterSchema = z
	.object({
		query: z.string().trim().min(1).max(128).optional(),
		availableInMCP: z.boolean().optional(),
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

export class CreateAgentDto extends Z.class({
	name: z.string().min(1),
	/**
	 * Client-minted agent id, so a surface can reference the agent (an artifact
	 * tab, a thread binding) before it decides to persist it. Must match the
	 * nanoid shape the entity would otherwise generate.
	 */
	id: z
		.string()
		.regex(/^[0-9A-Za-z]{16}$/)
		.optional(),
}) {}

export class UpdateAgentConfigDto extends Z.class({
	config: z.record(z.unknown()),
}) {}

export class CreateAgentTaskDto extends Z.class({
	name: agentTaskSchema.shape.name,
	objective: agentTaskSchema.shape.objective,
	cronExpression: agentTaskSchema.shape.cronExpression,
	// Seeds the config ref's enabled flag; the task body itself has no enabled.
	enabled: z.boolean().optional().default(true),
}) {}

export class UpdateAgentTaskDto extends Z.class({
	name: agentTaskSchema.shape.name.optional(),
	objective: agentTaskSchema.shape.objective.optional(),
	cronExpression: agentTaskSchema.shape.cronExpression.optional(),
}) {}

const updateAgentSkillShape = {
	name: agentSkillShape.name.optional(),
	description: agentSkillShape.description.optional(),
	instructions: agentSkillShape.instructions.optional(),
	allowedTools: agentSkillShape.allowedTools.optional(),
	references: agentSkillShape.references.optional(),
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
	attachments: z
		.array(agentChatAttachmentSchema)
		.max(MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE)
		.optional(),
};

const agentChatMessageSchema = z
	.object(agentChatMessageShape)
	.refine((value) => value.message.trim().length > 0 || (value.attachments?.length ?? 0) > 0, {
		message: 'Message text or at least one attachment is required',
		path: ['message'],
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

/**
 * Envelope check for the connect body. The channel itself is validated against
 * the per-platform integration schema, which is where `settings` is checked.
 */
export class AgentConnectIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
	/**
	 * Credential of the same type this channel takes over from. Swapping in one
	 * request keeps the agent from ever holding two live channels or none.
	 */
	replaces: z.object({ credentialId: z.string().min(1) }).optional(),
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
