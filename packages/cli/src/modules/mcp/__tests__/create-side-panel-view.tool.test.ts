import { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { UserError } from '@n8n/errors';

import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { canUseUiExtensionTools } from '../mcp-tool-availability';
import { createCreateSidePanelViewTool } from '../tools/create-side-panel-view.tool';

describe('create_side_panel_view MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const savedView = {
		id: 'view-1',
		kind: 'view' as const,
		title: 'Stats',
		source: 'export default {}',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};

	const setup = () => {
		const viewsService = mockInstance(UiExtensionViewsService, {
			upsert: vi.fn().mockResolvedValue({ view: savedView, created: true }),
		});
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });
		const tool = createCreateSidePanelViewTool(user, viewsService, telemetry);
		return { viewsService, telemetry, tool };
	};

	it('is a write tool with an output schema', () => {
		const { tool } = setup();

		expect(tool.name).toBe('create_side_panel_view');
		expect(tool.config.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		});
		expect(tool.config.outputSchema).toBeDefined();
		expect(tool.config.description).toContain('n8n.useContext()');
	});

	// Run data and the open actions work only in the views that ship with n8n.
	it('does not document the members that do nothing in a view from an MCP client', () => {
		const { tool } = setup();

		expect(tool.config.description).toContain('n8n.useLocale()');
		for (const name of ['data', 'useData', 'refresh', 'openExecution', 'openUrl']) {
			expect(tool.config.description, name).not.toMatch(new RegExp(`\\b${name}\\b`, 'i'));
		}
	});

	// The service emits the change, and a cli relay pushes it to the user.
	it('saves a view for the calling user', async () => {
		const { viewsService, telemetry, tool } = setup();

		const result = await tool.handler(
			{ title: 'Stats', icon: 'chart-column', source: 'export default {}' },
			{} as never,
		);

		expect(viewsService.upsert).toHaveBeenCalledWith('user-1', {
			viewId: undefined,
			kind: 'view',
			title: 'Stats',
			icon: 'chart-column',
			source: 'export default {}',
		});
		expect(result).toMatchObject({
			structuredContent: { viewId: 'view-1', title: 'Stats', created: true },
		});
		expect(result).not.toHaveProperty('isError');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: expect.objectContaining({ success: true }) }),
		);
	});

	it('passes the view ID to replace a view', async () => {
		const { viewsService, tool } = setup();
		viewsService.upsert.mockResolvedValue({ view: savedView, created: false });

		const result = await tool.handler(
			{ viewId: 'view-1', title: 'Stats', source: 'export default {}' },
			{} as never,
		);

		expect(viewsService.upsert).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ viewId: 'view-1' }),
		);
		expect(result).toMatchObject({ structuredContent: { created: false } });
	});

	it('returns an error result when the service refuses the view', async () => {
		const { viewsService, telemetry, tool } = setup();
		viewsService.upsert.mockRejectedValue(new UserError('You can have at most 20 views.'));

		const result = await tool.handler({ title: 'Stats', source: 'x' }, {} as never);

		expect(result).toMatchObject({
			isError: true,
			structuredContent: { error: 'You can have at most 20 views.' },
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: expect.objectContaining({ success: false }) }),
		);
	});

	it('tracks and rethrows an unexpected error', async () => {
		const { viewsService, telemetry, tool } = setup();
		viewsService.upsert.mockRejectedValue(new Error('db down'));

		await expect(tool.handler({ title: 'Stats', source: 'x' }, {} as never)).rejects.toThrow(
			'db down',
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: { success: false, error: 'db down' } }),
		);
	});
});

describe('canUseUiExtensionTools', () => {
	it.each([
		{ scopes: undefined, expected: true },
		{ scopes: ['uiExtension:write', 'workflow:read'], expected: true },
		{ scopes: ['uiExtension:write'], expected: false },
		{ scopes: ['sidePanelView:write', 'workflow:read'], expected: false },
		{ scopes: ['workflow:read'], expected: false },
		{ scopes: [], expected: false },
	])('is $expected for $scopes', ({ scopes, expected }) => {
		expect(canUseUiExtensionTools(scopes)).toBe(expected);
	});
});
