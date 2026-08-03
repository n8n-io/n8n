import { describe, expect, it } from 'vitest';

import { isFailedDelegateOutput, parseDelegateOutput } from '../delegate-tool';

describe('delegate-tool parsing', () => {
	it('parses suspended delegate output without treating it as failed', () => {
		const output = {
			status: 'suspended' as const,
			answer: 'waiting',
			pendingSuspend: [
				{
					runId: 'child-run-1',
					toolCallId: 'tool-call-1',
					toolName: 'delete_file',
					input: {},
					suspendPayload: {},
				},
			],
		};

		expect(parseDelegateOutput(output)).toEqual({
			status: 'suspended',
			answer: 'waiting',
		});
		expect(isFailedDelegateOutput('delegate_subagent', output)).toBe(false);
	});

	it('still treats failed delegate output as failed', () => {
		const output = { status: 'failed' as const, answer: '', error: 'boom' };

		expect(isFailedDelegateOutput('delegate_subagent', output)).toBe(true);
	});
});
