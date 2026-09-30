import {
	createMarkSessionFailedTool,
	MARK_SESSION_FAILED_TOOL_NAME,
} from '../mark-session-failed.tool';

describe('createMarkSessionFailedTool', () => {
	it('builds a tool with the correct name', () => {
		const tool = createMarkSessionFailedTool().build();
		expect(tool.name).toBe(MARK_SESSION_FAILED_TOOL_NAME);
	});

	it('returns a successful mark', async () => {
		const tool = createMarkSessionFailedTool().build();
		const result = await tool.handler!(
			{ reason: 'Could not recover' },
			{ parentTelemetry: undefined },
		);
		expect(result).toEqual({ marked: true });
	});
});
