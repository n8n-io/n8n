import { mcpServerDescriptionSchema, mcpServerNameSchema } from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

/** No slug: the slug of a server never changes, so that connected clients keep working. */
export class UpdateMcpServerDto extends Z.class(
	{
		name: mcpServerNameSchema.optional(),
		description: mcpServerDescriptionSchema.optional(),
	},
	{ strict: true },
) {}
