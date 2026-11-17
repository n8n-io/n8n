import { uiExtensionKindSchema } from '@n8n/api-types';
import type { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import type { TelemetryProxy } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import z from 'zod';

import { MCP_DELETE_UI_EXTENSION_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { trackAndRethrowToolError, trackAndReturnToolError } from './tool-error.utils';

const DESCRIPTION =
	'Remove a side panel view or a page that the current user added to the n8n editor through MCP. Get the ID from list_ui_extensions, or from create_side_panel_view or create_custom_page. Open editors remove the tab or the sidebar item at once. A user on a removed page goes to their home page. The views and the page that ship with n8n cannot be removed.';

const inputSchema = {
	id: z.string().min(1).describe('The ID of the view or the page to remove'),
} satisfies z.ZodRawShape;

const outputSchema = {
	id: z.string(),
	kind: uiExtensionKindSchema,
	title: z.string(),
} satisfies z.ZodRawShape;

export const createDeleteUiExtensionTool = (
	user: User,
	viewsService: UiExtensionViewsService,
	telemetry: TelemetryProxy,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_DELETE_UI_EXTENSION_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Delete UI Extension',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({ id }: { id: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_DELETE_UI_EXTENSION_TOOL_NAME,
			parameters: {},
		};

		try {
			const removed = await viewsService.remove(user.id, id);

			telemetryPayload.results = { success: true, data: { kind: removed.kind } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { id: removed.id, kind: removed.kind, title: removed.title };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			if (!(error instanceof UserError))
				trackAndRethrowToolError(telemetry, telemetryPayload, error);
			return trackAndReturnToolError(telemetry, telemetryPayload, error);
		}
	},
});
