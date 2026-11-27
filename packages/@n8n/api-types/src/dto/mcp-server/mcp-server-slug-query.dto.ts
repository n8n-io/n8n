import { mcpServerSlugSchema } from '../../schemas/mcp-server.schema';
import { Z } from '../../zod-class';

export class McpServerSlugQueryDto extends Z.class({ slug: mcpServerSlugSchema }) {}
