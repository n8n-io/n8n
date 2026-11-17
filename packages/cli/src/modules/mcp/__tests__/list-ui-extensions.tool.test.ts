import { UiExtensionViewsService } from '@n8n/backend-module-ui-extensions';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createListUiExtensionsTool } from '../tools/list-ui-extensions.tool';

describe('list_ui_extensions MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const setup = () => {
		const viewsService = mockInstance(UiExtensionViewsService, {
			list: vi.fn().mockResolvedValue([
				{
					id: 'v1',
					kind: 'view',
					title: 'Stats',
					icon: 'chart-column',
					source: 'secret source',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
				{
					id: 'p1',
					kind: 'page',
					title: 'KPIs',
					source: 'secret source',
					updatedAt: '2026-01-02T00:00:00.000Z',
				},
			]),
		});
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });
		const tool = createListUiExtensionsTool(user, viewsService, telemetry);
		return { viewsService, telemetry, tool };
	};

	it('is a read-only, idempotent tool', () => {
		const { tool } = setup();

		expect(tool.name).toBe('list_ui_extensions');
		expect(tool.config.annotations).toMatchObject({ readOnlyHint: true, idempotentHint: true });
		expect(tool.config.outputSchema).toBeDefined();
	});

	it('lists the records of the calling user without their source', async () => {
		const { viewsService, telemetry, tool } = setup();

		const result = await tool.handler({}, {} as never);

		expect(viewsService.list).toHaveBeenCalledExactlyOnceWith('user-1');
		expect(result).toEqual({
			content: [{ type: 'text', text: expect.any(String) }],
			structuredContent: {
				items: [
					{
						id: 'v1',
						kind: 'view',
						title: 'Stats',
						icon: 'chart-column',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
					{ id: 'p1', kind: 'page', title: 'KPIs', updatedAt: '2026-01-02T00:00:00.000Z' },
				],
			},
		});
		expect(JSON.stringify(result)).not.toContain('secret source');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: { success: true, data: { count: 2 } } }),
		);
	});

	it('tracks and rethrows an unexpected error', async () => {
		const { viewsService, telemetry, tool } = setup();
		viewsService.list.mockRejectedValue(new Error('db down'));

		await expect(tool.handler({}, {} as never)).rejects.toThrow('db down');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: { success: false, error: 'db down' } }),
		);
	});
});
