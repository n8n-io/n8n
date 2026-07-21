import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

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

export class CreateAgentDto extends Z.class({
	name: z.string().min(1),
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

export class AgentChatMessageDto extends Z.class({
	message: z.string().min(1),
	sessionId: z.string().min(1).optional(),
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

export class AgentDisconnectIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
}) {}

export class PublishAgentDto extends Z.class({
	versionId: z.string().min(1).optional(),
}) {}

export class RevertAgentToVersionDto extends Z.class({
	versionId: z.string().min(1),
}) {}

export class CreateSlackAgentAppDto extends Z.class({
	appConfigurationToken: z.string().min(1),
}) {}

export class TestAgentVectorStoreDto extends Z.class({
	vectorStore: AgentVectorStoreConfigSchema,
}) {}

export interface VectorStoreTestResult {
	success: boolean;
	message?: string;
	warning?: string;
}
