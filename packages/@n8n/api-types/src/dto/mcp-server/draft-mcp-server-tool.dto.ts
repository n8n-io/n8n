import { z } from 'zod';

import { mcpServerToolDraftFieldSchema } from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

/** Without `field`, the draft writes both fields, as after an add. Set `persist: false` to return a draft without saving it. */
export class DraftMcpServerToolDto extends Z.class(
	{
		field: mcpServerToolDraftFieldSchema.optional(),
		persist: z.boolean().optional(),
	},
	{ strict: true },
) {}
