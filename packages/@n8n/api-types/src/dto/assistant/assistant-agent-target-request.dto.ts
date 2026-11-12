import { Z } from '../../zod-class';
import { assistantAgentTargetSchema } from '../../schemas/assistant-agent-targets.schema';

/** Binds a saved agent to an Assistant agent thread, with its current name. */
export class AssistantAgentTargetRequestDto extends Z.class({
	...assistantAgentTargetSchema.shape,
	name: assistantAgentTargetSchema.shape.name.unwrap().min(1),
}) {}
