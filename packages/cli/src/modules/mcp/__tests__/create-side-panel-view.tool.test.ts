import { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { UserError } from '@n8n/errors';

import { Push } from '@/push';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { canUseSidePanelViewTool } from '../mcp-tool-availability';
import { createCreateSidePanelViewTool } from '../tools/create-side-panel-view.tool';

describe('create_side_panel_view MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const savedView = {
		id: 'view-1',
		title: 'Stats',
		source: 'export default {}',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};

	const setup = () => {
		const viewsService = mockInstance(UiExtensionViewsService, {
			upsert: vi.fn().mockResolvedValue({ view: savedView, created: true }),
		});
		const push = mockInstance(Push, { sendToUsers: vi.fn() });
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });
		const tool = createCreateSidePanelViewTool(user, viewsService, push, telemetry);
		return { viewsService, push, telemetry, tool };
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

	it('saves the view for the calling user and pushes the change to that user only', async () => {
		const { viewsService, push, telemetry, tool } = setup();

		const result = await tool.handler(
			{ title: 'Stats', icon: 'chart-column', source: 'export default {}' },
			{} as never,
		);

		expect(viewsService.upsert).toHaveBeenCalledWith('user-1', {
			viewId: undefined,
			title: 'Stats',
			icon: 'chart-column',
			source: 'export default {}',
		});
		expect(push.sendToUsers).toHaveBeenCalledWith({ type: 'uiExtensionViewsChanged', data: {} }, [
			'user-1',
		]);
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

	it('returns an error result and pushes nothing when the service refuses the view', async () => {
		const { viewsService, push, telemetry, tool } = setup();
		viewsService.upsert.mockRejectedValue(new UserError('You can have at most 20 views.'));

		const result = await tool.handler({ title: 'Stats', source: 'x' }, {} as never);

		expect(result).toMatchObject({
			isError: true,
			structuredContent: { error: 'You can have at most 20 views.' },
		});
		expect(push.sendToUsers).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: expect.objectContaining({ success: false }) }),
		);
	});

	it('rethrows an unexpected error and pushes nothing', async () => {
		const { viewsService, push, tool } = setup();
		viewsService.upsert.mockRejectedValue(new Error('db down'));

		await expect(tool.handler({ title: 'Stats', source: 'x' }, {} as never)).rejects.toThrow(
			'db down',
		);
		expect(push.sendToUsers).not.toHaveBeenCalled();
	});
});

describe('canUseSidePanelViewTool', () => {
	it.each([
		{ scopes: undefined, expected: true },
		{ scopes: ['sidePanelView:write', 'workflow:read'], expected: true },
		{ scopes: ['sidePanelView:write'], expected: false },
		{ scopes: ['workflow:read'], expected: false },
		{ scopes: [], expected: false },
	])('is $expected for $scopes', ({ scopes, expected }) => {
		expect(canUseSidePanelViewTool(scopes)).toBe(expected);
	});
});
