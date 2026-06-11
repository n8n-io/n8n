import { z } from 'zod';

import { interactiveResumeDataSchema } from '../agent-builder-interactive';
import { Z } from '../zod-class';
import { agentTaskSchema } from './agent-task.schema';

export class CreateAgentDto extends Z.class({
	name: z.string().min(1),
}) {}

export class UpdateAgentDto extends Z.class({
	name: z.string().optional(),
	updatedAt: z.string().optional(),
	description: z.string().optional(),
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

export const AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH = 10_000;

export const agentSkillSchema = z.object({
	name: z.string().min(1).max(128),
	description: z.string().min(1).max(512),
	instructions: z.string().min(1).max(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
});

export class CreateAgentSkillDto extends Z.class({
	...agentSkillSchema.shape,
}) {}

export class UpdateAgentSkillDto extends Z.class({
	name: agentSkillSchema.shape.name.optional(),
	description: agentSkillSchema.shape.description.optional(),
	instructions: agentSkillSchema.shape.instructions.optional(),
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
