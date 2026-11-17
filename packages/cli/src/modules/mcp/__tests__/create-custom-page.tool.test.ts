import { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { UserError } from '@n8n/errors';

import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createCreateCustomPageTool } from '../tools/create-custom-page.tool';

describe('create_custom_page MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const savedPage = {
		id: 'page-1',
		kind: 'page' as const,
		title: 'KPIs',
		source: 'export default {}',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};

	const setup = () => {
		const viewsService = mockInstance(UiExtensionViewsService, {
			upsert: vi.fn().mockResolvedValue({ view: savedPage, created: true }),
		});
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });
		const tool = createCreateCustomPageTool(user, viewsService, telemetry);
		return { viewsService, telemetry, tool };
	};

	it('is a write tool with an output schema', () => {
		const { tool } = setup();

		expect(tool.name).toBe('create_custom_page');
		expect(tool.config.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		});
		expect(tool.config.outputSchema).toBeDefined();
	});

	it('says that a page sees no workflow, where it shows, and its limit', () => {
		const { tool } = setup();

		expect(tool.config.description).toContain("{ page: 'other', routeName }");
		expect(tool.config.description).toContain('A page sees no workflow');
		expect(tool.config.description).toContain('under Inbox');
		expect(tool.config.description).toContain('at most 20 pages');
	});

	// Run data and the open actions work only in what ships with n8n.
	it('does not document the members that do nothing on a page from an MCP client', () => {
		const { tool } = setup();

		expect(tool.config.description).toContain('n8n.useLocale()');
		for (const name of ['data', 'useData', 'refresh', 'openExecution', 'openUrl', 'openWorkflow']) {
			expect(tool.config.description, name).not.toMatch(new RegExp(`\\b${name}\\b`, 'i'));
		}
	});

	it('saves a page for the calling user', async () => {
		const { viewsService, telemetry, tool } = setup();

		const result = await tool.handler(
			{ title: 'KPIs', icon: 'layout-dashboard', source: 'export default {}' },
			{} as never,
		);

		expect(viewsService.upsert).toHaveBeenCalledExactlyOnceWith('user-1', {
			viewId: undefined,
			kind: 'page',
			title: 'KPIs',
			icon: 'layout-dashboard',
			source: 'export default {}',
		});
		expect(result).toMatchObject({
			structuredContent: { pageId: 'page-1', title: 'KPIs', created: true },
		});
		expect(result).not.toHaveProperty('isError');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: expect.objectContaining({ success: true }) }),
		);
	});

	it('passes the page ID to replace a page', async () => {
		const { viewsService, tool } = setup();
		viewsService.upsert.mockResolvedValue({ view: savedPage, created: false });

		const result = await tool.handler(
			{ pageId: 'page-1', title: 'KPIs', source: 'export default {}' },
			{} as never,
		);

		expect(viewsService.upsert).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ viewId: 'page-1', kind: 'page' }),
		);
		expect(result).toMatchObject({ structuredContent: { created: false } });
	});

	it('returns an error result when the service refuses the page', async () => {
		const { viewsService, telemetry, tool } = setup();
		viewsService.upsert.mockRejectedValue(new UserError('You can have at most 20 pages.'));

		const result = await tool.handler({ title: 'KPIs', source: 'x' }, {} as never);

		expect(result).toMatchObject({
			isError: true,
			structuredContent: { error: 'You can have at most 20 pages.' },
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: expect.objectContaining({ success: false }) }),
		);
	});

	it('tracks and rethrows an unexpected error', async () => {
		const { viewsService, telemetry, tool } = setup();
		viewsService.upsert.mockRejectedValue(new Error('db down'));

		await expect(tool.handler({ title: 'KPIs', source: 'x' }, {} as never)).rejects.toThrow(
			'db down',
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: { success: false, error: 'db down' } }),
		);
	});
});
