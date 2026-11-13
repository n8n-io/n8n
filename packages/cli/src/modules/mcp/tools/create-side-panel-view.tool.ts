import {
	UI_EXTENSION_MAX_VIEWS_PER_USER,
	uiExtensionViewIconSchema,
	uiExtensionViewSourceSchema,
	uiExtensionViewTitleSchema,
} from '@n8n/api-types';
import type { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import z from 'zod';

import type { Push } from '@/push';
import type { Telemetry } from '@/telemetry';

import { MCP_CREATE_SIDE_PANEL_VIEW_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

const DESCRIPTION = `Add a view to the side panel of the n8n editor, or replace one. The view shows as a new tab for the current user. Open editors show it at once, with no reload.

A view is one JavaScript ES module with no import statements. Its default export is a Vue 3 component options object. A "template" string is allowed. Example:

export default {
  setup() {
    const context = n8n.useContext();
    const label = Vue.computed(() => context.value.page === 'workflow' ? (context.value.workflow?.name ?? 'Hidden workflow') : context.value.page);
    return { label };
  },
  template: '<N8nCard><N8nHeading tag="h3" size="small">{{ label }}</N8nHeading></N8nCard>',
};

The view runs in a sandboxed iframe with no network access to n8n. It has two globals:
- Vue: the Vue 3 API (ref, computed, watch, h, ...).
- n8n.useContext(): a read-only ref to the page context. It updates when the user opens another page or edits the workflow. Its shape is one of:
  { page: 'workflow', routeName, workflow: { id, name, active, nodes: [{ name, type }] } | null }
  { page: 'workflows', routeName, projectId, totalWorkflows: null }
  { page: 'other', routeName }
  "workflow" is null unless the open workflow is available in MCP.
- n8n.t(key): returns the translated string for key, or the key itself.

These n8n design system components are registered: N8nText, N8nHeading, N8nCard, N8nButton, N8nBadge, N8nIcon, N8nCallout, N8nTag. Use them and the CSS variables of the design system (for example var(--spacing--sm)) so the view looks like n8n.

A user can have at most ${UI_EXTENSION_MAX_VIEWS_PER_USER} views. Pass the viewId of an existing view to replace it. After the call, tell the user to open the side panel tab with the view title.`;

const inputSchema = {
	viewId: z
		.string()
		.optional()
		.describe('The ID of a view that this tool returned before. The view is replaced.'),
	title: uiExtensionViewTitleSchema.describe('The tab title, at most 40 characters'),
	icon: uiExtensionViewIconSchema
		.optional()
		.describe('Optional Lucide icon name for the tab, for example "chart-column"'),
	source: uiExtensionViewSourceSchema.describe(
		'The view: one ES module whose default export is a Vue component options object',
	),
} satisfies z.ZodRawShape;

const outputSchema = {
	viewId: z.string(),
	title: z.string(),
	created: z.boolean(),
} satisfies z.ZodRawShape;

export const createCreateSidePanelViewTool = (
	user: User,
	viewsService: UiExtensionViewsService,
	push: Push,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_CREATE_SIDE_PANEL_VIEW_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Create Side Panel View',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		viewId,
		title,
		icon,
		source,
	}: {
		viewId?: string;
		title: string;
		icon?: string;
		source: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_CREATE_SIDE_PANEL_VIEW_TOOL_NAME,
			parameters: { hasViewId: viewId !== undefined, sourceLength: source.length },
		};

		try {
			const { view, created } = await viewsService.upsert(user.id, {
				viewId,
				title,
				icon,
				source,
			});

			push.sendToUsers({ type: 'uiExtensionViewsChanged', data: {} }, [user.id]);

			telemetryPayload.results = { success: true, data: { viewId: view.id, created } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { viewId: view.id, title: view.title, created };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			if (!(error instanceof UserError)) throw error;

			telemetryPayload.results = { success: false, error: error.message };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { error: error.message };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
