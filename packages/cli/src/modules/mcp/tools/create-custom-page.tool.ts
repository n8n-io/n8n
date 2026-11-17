import {
	UI_EXTENSION_MAX_PAGES_PER_USER,
	uiExtensionViewIconSchema,
	uiExtensionViewSourceSchema,
	uiExtensionViewTitleSchema,
} from '@n8n/api-types';
import type { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import z from 'zod';

import type { Telemetry } from '@/telemetry';

import { MCP_CREATE_CUSTOM_PAGE_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { trackAndRethrowToolError, trackAndReturnToolError } from './tool-error.utils';

const DESCRIPTION = `Add a page to the n8n editor, or replace one. The page shows for the current user in the main left sidebar, in its own group under Inbox. A click on it opens the page in the main area. Open editors show it at once, with no reload.

A page is one JavaScript ES module with no import statements. Its default export is a Vue 3 component options object. A "template" string is allowed. Example:

export default {
  setup() {
    const locale = n8n.useLocale();
    const today = Vue.computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'full' }).format(new Date()));
    return { today };
  },
  template: '<div style="padding: var(--spacing--lg)"><N8nHeading tag="h1" size="xlarge">Team notes</N8nHeading><N8nText color="text-light">{{ today }}</N8nText></div>',
};

The page runs in a sandboxed iframe with no network access to n8n. It has two globals:
- Vue: the Vue 3 API (ref, computed, watch, h, ...).
- n8n.useContext(): a read-only ref to the page context. On a page it is always { page: 'other', routeName }. A page sees no workflow.
- n8n.t(key, params): returns the translated string for key with each {name} placeholder filled from params, or the key itself.
- n8n.useLocale(): a read-only ref to the editor's locale, such as "en". Use it with Intl to format dates and numbers.

These n8n design system components are registered: N8nText, N8nHeading, N8nCard, N8nButton, N8nBadge, N8nIcon, N8nCallout, N8nTag. Use them and the CSS variables of the design system (for example var(--spacing--sm)) so the page looks like n8n. The page fills the main area, so give it padding.

A user can have at most ${UI_EXTENSION_MAX_PAGES_PER_USER} pages. Pass the pageId of an existing page to replace it. After the call, tell the user to open the page with its title in the sidebar.`;

const inputSchema = {
	pageId: z
		.string()
		.optional()
		.describe('The ID of a page that this tool returned before. The page is replaced.'),
	title: uiExtensionViewTitleSchema.describe('The sidebar title, at most 40 characters'),
	icon: uiExtensionViewIconSchema
		.optional()
		.describe('Optional Lucide icon name for the sidebar item, for example "layout-dashboard"'),
	source: uiExtensionViewSourceSchema.describe(
		'The page: one ES module whose default export is a Vue component options object',
	),
} satisfies z.ZodRawShape;

const outputSchema = {
	pageId: z.string(),
	title: z.string(),
	created: z.boolean(),
} satisfies z.ZodRawShape;

export const createCreateCustomPageTool = (
	user: User,
	viewsService: UiExtensionViewsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_CREATE_CUSTOM_PAGE_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Create Custom Page',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		pageId,
		title,
		icon,
		source,
	}: {
		pageId?: string;
		title: string;
		icon?: string;
		source: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_CREATE_CUSTOM_PAGE_TOOL_NAME,
			parameters: { hasPageId: pageId !== undefined, sourceLength: source.length },
		};

		try {
			const { view, created } = await viewsService.upsert(user.id, {
				viewId: pageId,
				kind: 'page',
				title,
				icon,
				source,
			});

			telemetryPayload.results = { success: true, data: { pageId: view.id, created } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { pageId: view.id, title: view.title, created };
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
