import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { UserCalledMCPToolEventPayload } from '../mcp.types';
import { trackAndRethrowToolError, trackAndReturnToolError } from '../tools/tool-error.utils';

describe('MCP tool errors', () => {
	const telemetry = { track: vi.fn() } as unknown as Telemetry;
	let payload: UserCalledMCPToolEventPayload;

	beforeEach(() => {
		vi.clearAllMocks();
		payload = {
			user_id: 'user-1',
			tool_name: 'create_data_table',
			parameters: { projectId: 'p-1' },
		};
	});

	it.each([new Error('failed'), 'failed'])(
		'tracks a failure and returns its error envelope',
		(error) => {
			const result = trackAndReturnToolError(telemetry, payload, error);

			expect(payload.results).toEqual({ success: false, error: 'failed' });
			expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(USER_CALLED_MCP_TOOL_EVENT, payload);
			expect(result).toEqual({
				content: [{ type: 'text', text: '{"error":"failed"}' }],
				structuredContent: { error: 'failed' },
				isError: true,
			});
		},
	);

	it('keeps a tool-specific output shape in the text and structured content', () => {
		const result = trackAndReturnToolError(telemetry, payload, 'failed', (message) => ({
			data: [],
			count: 0,
			error: message,
		}));

		expect(result.content).toEqual([
			{ type: 'text', text: '{"data":[],"count":0,"error":"failed"}' },
		]);
		expect(result.structuredContent).toEqual({ data: [], count: 0, error: 'failed' });
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(USER_CALLED_MCP_TOOL_EVENT, payload);
	});

	it.each([new Error('failed'), 'failed'])(
		'tracks a failure and rethrows the same value',
		(error) => {
			expect(() => trackAndRethrowToolError(telemetry, payload, error)).toThrow(error);
			expect(payload.results).toEqual({ success: false, error: 'failed' });
			expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(USER_CALLED_MCP_TOOL_EVENT, payload);
		},
	);
});
