import {
	mcpServerDescriptionSchema,
	mcpServerNameSchema,
	mcpServerSlugSchema,
} from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

export class CreateMcpServerDto extends Z.class(
	{
		name: mcpServerNameSchema,
		slug: mcpServerSlugSchema,
		description: mcpServerDescriptionSchema.default(''),
	},
	{ strict: true },
) {}
