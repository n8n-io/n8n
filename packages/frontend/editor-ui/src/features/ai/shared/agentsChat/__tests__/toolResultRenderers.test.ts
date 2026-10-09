import { describe, expect, it } from 'vitest';

import { TOOL_CALL_STATE } from '../constants';
import {
	findToolResultRenderer,
	type AgentsChatInteractionExtension,
} from '../interactionRegistry';
import type { ToolCall } from '../types';
import {
	TEST_RESULT_EXTENSION_KEY,
	TEST_RESULT_TOOL_NAME,
	TestToolResult,
	testInteractionExtension,
	testToolResultExtension,
} from './fixtures/testInteractionExtension';

const finishedCall: ToolCall = {
	tool: TEST_RESULT_TOOL_NAME,
	toolCallId: 'tc-1',
	state: TOOL_CALL_STATE.DONE,
	input: { text: 'Remember this' },
	output: { saved: true },
};

describe('findToolResultRenderer', () => {
	it('returns the host renderer of a result-only extension for a finished call', () => {
		expect(findToolResultRenderer(finishedCall, [testToolResultExtension])).toEqual({
			key: TEST_RESULT_EXTENSION_KEY,
			component: TestToolResult,
		});
	});

	it('returns undefined without extensions', () => {
		expect(findToolResultRenderer(finishedCall, [])).toBeUndefined();
	});

	it('returns undefined when no extension matches the call', () => {
		expect(
			findToolResultRenderer({ ...finishedCall, tool: 'other_tool' }, [testToolResultExtension]),
		).toBeUndefined();
	});

	it('ignores extensions that only provide cards', () => {
		expect(findToolResultRenderer(finishedCall, [testInteractionExtension])).toBeUndefined();
	});

	it('ignores an extension that matches but has no result component', () => {
		const extension: AgentsChatInteractionExtension = {
			...testToolResultExtension,
			resultComponent: undefined,
		};

		expect(findToolResultRenderer(finishedCall, [extension])).toBeUndefined();
	});

	it.each([
		TOOL_CALL_STATE.PENDING,
		TOOL_CALL_STATE.RUNNING,
		TOOL_CALL_STATE.SUSPENDED,
		TOOL_CALL_STATE.ERROR,
	])('keeps the default step for a call in state %s', (state) => {
		expect(
			findToolResultRenderer({ ...finishedCall, state }, [testToolResultExtension]),
		).toBeUndefined();
	});

	it.each([
		['the cancelled state', { state: TOOL_CALL_STATE.CANCELLED }],
		['the canceled flag', { canceled: true }],
	])('keeps the default step for a call canceled with %s', (_, canceled) => {
		expect(
			findToolResultRenderer({ ...finishedCall, ...canceled }, [testToolResultExtension]),
		).toBeUndefined();
	});

	it('keeps the default step for a finished call without output', () => {
		expect(
			findToolResultRenderer({ ...finishedCall, output: undefined }, [testToolResultExtension]),
		).toBeUndefined();
	});

	it('uses the first extension that matches', () => {
		const second: AgentsChatInteractionExtension = {
			...testToolResultExtension,
			key: 'second',
		};

		expect(findToolResultRenderer(finishedCall, [testToolResultExtension, second])?.key).toBe(
			TEST_RESULT_EXTENSION_KEY,
		);
	});
});
