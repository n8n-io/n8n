import { uiExtensionKindSchema } from '@n8n/api-types';
import type { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import type { User } from '@n8n/db';
import z from 'zod';

import type { Telemetry } from '@/telemetry';

import { MCP_LIST_UI_EXTENSIONS_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { trackAndRethrowToolError } from './tool-error.utils';

const DESCRIPTION =
	'List the side panel views and the pages that the current user added to the n8n editor through MCP. Each item has its ID, kind ("view" or "page"), title and icon. Pass an ID to delete_ui_extension to remove the item. The views and the page that ship with n8n are not listed.';

const inputSchema = {} satisfies z.ZodRawShape;

const outputSchema = {
	items: z.array(
		z.object({
			id: z.string(),
			kind: uiExtensionKindSchema,
			title: z.string(),
			icon: z.string().optional(),
			updatedAt: z.string(),
		}),
	),
} satisfies z.ZodRawShape;

export const createListUiExtensionsTool = (
	user: User,
	viewsService: UiExtensionViewsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_LIST_UI_EXTENSIONS_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'List UI Extensions',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_LIST_UI_EXTENSIONS_TOOL_NAME,
			parameters: {},
		};

		try {
			const views = await viewsService.list(user.id);
			// The source can be large, and the client does not need it to pick an item.
			const items = views.map(({ id, kind, title, icon, updatedAt }) => ({
				id,
				kind,
				title,
				...(icon !== undefined && { icon }),
				updatedAt,
			}));

			telemetryPayload.results = { success: true, data: { count: items.length } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { items };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return trackAndRethrowToolError(telemetry, telemetryPayload, error);
		}
	},
});
