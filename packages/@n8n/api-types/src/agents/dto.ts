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

const agentSkillStringArraySchema = z.array(z.string().trim().min(1)).min(1);

const agentSkillReferenceSchema = z.object({
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
	bytes: z.number().int().nonnegative(),
	sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const agentSkillInterfaceSchema = z
	.object({
		displayName: z.string().min(1).optional(),
		shortDescription: z.string().min(1).optional(),
		defaultPrompt: z.string().min(1).optional(),
		icon: z.string().min(1).optional(),
		brandColor: z.string().min(1).optional(),
	})
	.strict();

const agentSkillPolicySchema = z
	.object({
		allowImplicitInvocation: z.boolean().optional(),
		product: z.string().min(1).optional(),
	})
	.strict();

const agentSkillDependenciesSchema = z
	.object({
		tools: agentSkillStringArraySchema.optional(),
		secrets: agentSkillStringArraySchema.optional(),
		mcpServers: z
			.array(
				z
					.object({
						name: z.string().min(1),
						description: z.string().min(1).optional(),
						transport: z.string().min(1).optional(),
						url: z.string().min(1).optional(),
						command: z.string().min(1).optional(),
					})
					.strict(),
			)
			.min(1)
			.optional(),
	})
	.strict();

const agentSkillShape = {
	name: z.string().min(1).max(128),
	description: z.string().min(1).max(512),
	instructions: z.string().min(1).max(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
	allowedTools: agentSkillStringArraySchema.optional(),
	recommendedTools: agentSkillStringArraySchema.optional(),
	interface: agentSkillInterfaceSchema.optional(),
	policy: agentSkillPolicySchema.optional(),
	dependencies: agentSkillDependenciesSchema.optional(),
	version: z.string().min(1).max(128).optional(),
	license: z.string().min(1).max(128).optional(),
	compatibility: z.string().min(1).optional(),
	platforms: agentSkillStringArraySchema.optional(),
	metadata: z.record(z.unknown()).optional(),
	references: z.array(agentSkillReferenceSchema).optional(),
	scripts: z.never().optional(),
	templates: z.never().optional(),
	assets: z.never().optional(),
	examples: z.never().optional(),
	other: z.never().optional(),
};
const agentSkillAllowedFields = new Set(Object.keys(agentSkillShape));

export const agentSkillSchema = z
	.object(agentSkillShape)
	.passthrough()
	.superRefine((skill, ctx) => {
		for (const field of Object.keys(skill)) {
			if (agentSkillAllowedFields.has(field)) continue;
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Unsupported skill field "${field}"`,
				path: [field],
			});
		}
		const paths = new Set<string>();
		for (const [index, reference] of (skill.references ?? []).entries()) {
			if (paths.has(reference.path)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate reference path "${reference.path}"`,
					path: ['references', index, 'path'],
				});
			}
			paths.add(reference.path);
		}
	});

export class CreateAgentSkillDto extends Z.class({
	...agentSkillShape,
}) {}

export class UpdateAgentSkillDto extends Z.class({
	name: agentSkillShape.name.optional(),
	description: agentSkillShape.description.optional(),
	instructions: agentSkillShape.instructions.optional(),
	allowedTools: agentSkillShape.allowedTools.optional(),
	recommendedTools: agentSkillShape.recommendedTools.optional(),
	interface: agentSkillShape.interface.optional(),
	policy: agentSkillShape.policy.optional(),
	dependencies: agentSkillShape.dependencies.optional(),
	version: agentSkillShape.version.optional(),
	license: agentSkillShape.license.optional(),
	compatibility: agentSkillShape.compatibility.optional(),
	platforms: agentSkillShape.platforms.optional(),
	metadata: agentSkillShape.metadata.optional(),
	references: agentSkillShape.references.optional(),
}) {}

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
