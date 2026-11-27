import { mcpServerToolDraftFieldSchema } from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

/** Without `field`, the draft writes both fields, as after an add. */
export class DraftMcpServerToolDto extends Z.class(
	{ field: mcpServerToolDraftFieldSchema.optional() },
	{ strict: true },
) {}
