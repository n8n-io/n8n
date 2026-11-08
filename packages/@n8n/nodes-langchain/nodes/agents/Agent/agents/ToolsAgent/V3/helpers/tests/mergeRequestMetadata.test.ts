import type { ToolCallData } from '@utils/agent-execution';
import { mergeRequestMetadata } from '../mergeRequestMetadata';

describe('mergeRequestMetadata', () => {
	const step0: ToolCallData = {
		action: {
			tool: 'tool_0',
			toolInput: { input: '0' },
			log: 'log 0',
			toolCallId: 'call_0',
			type: 'tool_call',
		},
		observation: 'result 0',
		itemIndex: 0,
	};

	const step1: ToolCallData = {
		action: {
			tool: 'tool_1',
			toolInput: { input: '1' },
			log: 'log 1',
			toolCallId: 'call_1',
			type: 'tool_call',
		},
		observation: 'result 1',
		itemIndex: 1,
	};

	it('should return from if into is undefined', () => {
		const from = { previousRequests: [step0], iterationCount: 1 };
		expect(mergeRequestMetadata(undefined, from)).toEqual(from);
	});

	it('should return into if from is undefined', () => {
		const into = { previousRequests: [step0], iterationCount: 1 };
		expect(mergeRequestMetadata(into, undefined)).toEqual(into);
	});

	it('should return undefined if both into and from are undefined', () => {
		expect(mergeRequestMetadata(undefined, undefined)).toBeUndefined();
	});

	it('should return into unchanged if from has no previousRequests', () => {
		const into = { previousRequests: [step0], iterationCount: 1 };
		const from = { iterationCount: 2 };
		expect(mergeRequestMetadata(into, from)).toEqual(into);
	});

	it('should add previousRequests from from if into has no previousRequests', () => {
		const into = { iterationCount: 1 };
		const from = { previousRequests: [step0] };
		expect(mergeRequestMetadata(into, from)).toEqual({
			iterationCount: 1,
			previousRequests: [step0],
		});
	});

	it('should concatenate previousRequests from into and from', () => {
		const into = { previousRequests: [step0], iterationCount: 1 };
		const from = { previousRequests: [step1], iterationCount: 2 };
		expect(mergeRequestMetadata(into, from)).toEqual({
			iterationCount: 1,
			previousRequests: [step0, step1],
		});
	});
});
