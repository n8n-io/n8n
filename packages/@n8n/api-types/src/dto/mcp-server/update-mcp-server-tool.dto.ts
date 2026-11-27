import {
	mcpServerToolDescriptionSchema,
	mcpServerToolNameSchema,
} from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

export class UpdateMcpServerToolDto extends Z.class(
	{
		toolName: mcpServerToolNameSchema.optional(),
		description: mcpServerToolDescriptionSchema.optional(),
	},
	{ strict: true },
) {}
