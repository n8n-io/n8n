import { agentSkillSchema } from './create-agent-skill.dto';
import { Z } from '../../zod-class';

export class UpdateAgentSkillDto extends Z.class({
	name: agentSkillSchema.shape.name.optional(),
	description: agentSkillSchema.shape.description.optional(),
	instructions: agentSkillSchema.shape.instructions.optional(),
}) {}
