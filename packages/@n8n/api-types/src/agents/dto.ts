import { z } from 'zod';

import { interactiveResumeDataSchema } from '../agent-builder-interactive';
import { Z } from '../zod-class';

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

export class UpdateAgentScheduleDto extends Z.class({
	cronExpression: z.string(),
	wakeUpPrompt: z.string().optional(),
}) {}

export class CreateAgentTaskDto extends Z.class({
	name: z.string().min(1).max(128),
	goal: z.string().min(1).max(10_000),
	cronExpression: z.string().min(1),
	active: z.boolean().optional(),
}) {}

export class UpdateAgentTaskDto extends Z.class({
	name: z.string().min(1).max(128).optional(),
	goal: z.string().min(1).max(10_000).optional(),
	cronExpression: z.string().min(1).optional(),
	active: z.boolean().optional(),
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

export class AgentDisconnectIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
}) {}
