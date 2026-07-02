import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { interactiveResumeDataSchema } from '../agent-builder-interactive';
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

export const AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH = 65_536;
export const AGENT_SKILL_REFERENCE_MAX_COUNT = 20;
export const AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES = 65_536;
export const AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES = 262_144;

const agentSkillStringArraySchema = z.array(z.string().trim().min(1));

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

const agentSkillReferenceSchema = z
	.object({
		path: z
			.string()
			.min(1)
			.max(512)
			.refine((path) => {
				const normalized = path.replaceAll('\\', '/');
				const segments = normalized.split('/');
				return (
					path === normalized &&
					normalized.startsWith('references/') &&
					(normalized.endsWith('.md') || normalized.endsWith('.markdown')) &&
					segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
				);
			}, 'Reference path must be a markdown file under references/'),
		content: z.string().min(1),
	})
	.strict()
	.superRefine((reference, ctx) => {
		if (utf8ByteLength(reference.content) > AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Reference content must be ${AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES} bytes or fewer`,
				path: ['content'],
			});
		}
	});

const agentSkillReferencesSchema = z
	.array(agentSkillReferenceSchema)
	.max(AGENT_SKILL_REFERENCE_MAX_COUNT)
	.superRefine((references, ctx) => {
		const paths = new Set<string>();
		let totalBytes = 0;
		for (const [index, reference] of references.entries()) {
			totalBytes += utf8ByteLength(reference.content);
			if (paths.has(reference.path)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate reference path "${reference.path}"`,
					path: [index, 'path'],
				});
			}
			paths.add(reference.path);
		}
		if (totalBytes > AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Reference content must total ${AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES} bytes or fewer`,
			});
		}
	});

const agentSkillShape = {
	name: z.string().min(1).max(128),
	description: z.string().min(1).max(512),
	instructions: z.string().min(1).max(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
	allowedTools: agentSkillStringArraySchema.optional(),
	references: agentSkillReferencesSchema.optional(),
	scripts: z.never().optional(),
	templates: z.never().optional(),
	assets: z.never().optional(),
	examples: z.never().optional(),
	other: z.never().optional(),
};

export const agentSkillSchema = z.object(agentSkillShape).strict();

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

export class AgentBuildResumeDto extends Z.class({
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
	resumeData: interactiveResumeDataSchema,
}) {}

export class AgentChatResumeDto extends Z.class({
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
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
