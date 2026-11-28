import {
	mcpServerDescriptionSchema,
	mcpServerNameSchema,
	mcpServerSlugSchema,
} from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

export class UpdateMcpServerDto extends Z.class(
	{
		name: mcpServerNameSchema.optional(),
		description: mcpServerDescriptionSchema.optional(),
		slug: mcpServerSlugSchema.optional(),
	},
	{ strict: true },
) {}
