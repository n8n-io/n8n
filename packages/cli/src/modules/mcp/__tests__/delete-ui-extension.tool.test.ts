import {
	UiExtensionViewNotFoundError,
	UiExtensionViewsService,
} from '@n8n/backend-module-ui-extensions';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createDeleteUiExtensionTool } from '../tools/delete-ui-extension.tool';

describe('delete_ui_extension MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const setup = () => {
		const viewsService = mockInstance(UiExtensionViewsService, {
			remove: vi.fn().mockResolvedValue({
				id: 'p1',
				kind: 'page',
				title: 'KPIs',
				source: 'x',
				updatedAt: '2026-01-01T00:00:00.000Z',
			}),
		});
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });
		const tool = createDeleteUiExtensionTool(user, viewsService, telemetry);
		return { viewsService, telemetry, tool };
	};

	it('is a destructive tool with an output schema', () => {
		const { tool } = setup();

		expect(tool.name).toBe('delete_ui_extension');
		expect(tool.config.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		});
		expect(tool.config.outputSchema).toBeDefined();
	});

	it('removes the record of the calling user', async () => {
		const { viewsService, telemetry, tool } = setup();

		const result = await tool.handler({ id: 'p1' }, {} as never);

		expect(viewsService.remove).toHaveBeenCalledExactlyOnceWith('user-1', 'p1');
		expect(result).toMatchObject({ structuredContent: { id: 'p1', kind: 'page', title: 'KPIs' } });
		expect(result).not.toHaveProperty('isError');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: { success: true, data: { kind: 'page' } } }),
		);
	});

	it('returns an error result for an ID that the user does not have', async () => {
		const { viewsService, tool } = setup();
		viewsService.remove.mockRejectedValue(new UiExtensionViewNotFoundError('other'));

		const result = await tool.handler({ id: 'other' }, {} as never);

		expect(result).toMatchObject({
			isError: true,
			structuredContent: { error: expect.stringContaining('"other"') },
		});
	});

	it('tracks and rethrows an unexpected error', async () => {
		const { viewsService, telemetry, tool } = setup();
		viewsService.remove.mockRejectedValue(new Error('db down'));

		await expect(tool.handler({ id: 'p1' }, {} as never)).rejects.toThrow('db down');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({ results: { success: false, error: 'db down' } }),
		);
	});
});
