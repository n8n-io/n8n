import { describe, expect, it } from 'vitest';

import type { TimelineEvent } from '../execution-recorder';
import { latestSessionActivity } from '../utils/latest-session-activity';

const tool: Extract<TimelineEvent, { type: 'tool-call' }> = {
	type: 'tool-call',
	kind: 'node',
	name: 'send_mail',
	toolCallId: 'tool-1',
	input: { secret: 'private input' },
	output: { secret: 'private output' },
	startTime: 10,
	endTime: 30,
	success: true,
	nodeDisplayName: 'Send report',
};

describe('latestSessionActivity', () => {
	it('returns no activity for missing timelines and input events', () => {
		expect(latestSessionActivity(null)).toBeNull();
		expect(latestSessionActivity([])).toBeNull();
		expect(
			latestSessionActivity([{ type: 'input', messageId: 'message-1', timestamp: 100 }]),
		).toBeNull();
	});

	it('uses tool completion time without exposing input or output', () => {
		expect(
			latestSessionActivity([
				tool,
				{ type: 'reasoning', content: 'Private reasoning', timestamp: 20 },
			]),
		).toEqual({ type: 'tool-call', toolName: 'send_mail', displayName: 'Send report' });
	});

	it('uses the start time for an unfinished tool', () => {
		expect(
			latestSessionActivity([
				{ ...tool, startTime: 40, endTime: 0 },
				{ type: 'text', content: 'Private response', timestamp: 20, endTime: 35 },
			]),
		).toEqual({ type: 'tool-call', toolName: 'send_mail', displayName: 'Send report' });
	});

	it('uses later text and reasoning without exposing content', () => {
		expect(
			latestSessionActivity([tool, { type: 'text', content: 'Private response', timestamp: 40 }]),
		).toEqual({ type: 'text' });
		expect(
			latestSessionActivity([
				tool,
				{ type: 'reasoning', content: 'Private reasoning', timestamp: 40 },
			]),
		).toEqual({ type: 'reasoning' });
	});

	it('keeps workflow names and raw built-in tool names distinct', () => {
		expect(
			latestSessionActivity([
				{ ...tool, nodeDisplayName: undefined, workflowName: 'Weekly report' },
			]),
		).toEqual({ type: 'tool-call', toolName: 'send_mail', displayName: 'Weekly report' });
		expect(
			latestSessionActivity([{ ...tool, name: 'web_search', nodeDisplayName: undefined }]),
		).toEqual({ type: 'tool-call', toolName: 'web_search', displayName: undefined });
	});
});
