import { z } from 'zod';

export const MCP_TOOL_CATEGORIES = ['read', 'write'] as const;
export const MCP_TOOL_PERMISSIONS = ['allow', 'ask', 'block'] as const;

export const mcpToolCategorySchema = z.enum(MCP_TOOL_CATEGORIES);
export const mcpToolPermissionSchema = z.enum(MCP_TOOL_PERMISSIONS);

export const mcpToolPermissionsSchema = z
	.object({
		categories: z
			.object({
				read: mcpToolPermissionSchema,
				write: mcpToolPermissionSchema,
			})
			.strict(),
		tools: z.record(z.string().min(1), mcpToolPermissionSchema).optional(),
	})
	.strict();

export type McpToolCategory = z.infer<typeof mcpToolCategorySchema>;
export type McpToolPermission = z.infer<typeof mcpToolPermissionSchema>;
export type McpToolPermissions = z.infer<typeof mcpToolPermissionsSchema>;
