import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiTimelineEntry } from '@n8n/api-types';
import { getRenderableAgentResult } from '../agentResult';

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

describe('getRenderableAgentResult', () => {
	test('returns null when result is undefined', () => {
		expect(getRenderableAgentResult(makeAgentNode())).toBeNull();
	});

	test('returns null when result is empty string', () => {
		expect(getRenderableAgentResult(makeAgentNode({ result: '' }))).toBeNull();
	});

	test('returns null when result is only whitespace', () => {
		expect(getRenderableAgentResult(makeAgentNode({ result: '   \n  ' }))).toBeNull();
	});

	test('returns result when it differs from textContent', () => {
		const node = makeAgentNode({
			result: 'Final summary of work done.',
			textContent: 'Some intermediate text.',
		});
		expect(getRenderableAgentResult(node)).toBe('Final summary of work done.');
	});

	test('returns null when result matches textContent exactly', () => {
		const node = makeAgentNode({
			result: 'Same text',
			textContent: 'Same text',
		});
		expect(getRenderableAgentResult(node)).toBeNull();
	});

	test('returns null when result matches textContent after whitespace normalization', () => {
		const node = makeAgentNode({
			result: '  Hello   world  ',
			textContent: 'Hello world',
		});
		expect(getRenderableAgentResult(node)).toBeNull();
	});

	test('returns null when result matches timeline text entries', () => {
		const timeline: InstanceAiTimelineEntry[] = [
			{ type: 'text', content: 'Hello ' },
			{ type: 'tool-call', toolCallId: 'tc-1' },
			{ type: 'text', content: 'world' },
		];
		const node = makeAgentNode({
			result: 'Hello world',
			timeline,
		});
		expect(getRenderableAgentResult(node)).toBeNull();
	});

	test('returns result when it differs from timeline text', () => {
		const timeline: InstanceAiTimelineEntry[] = [{ type: 'text', content: 'Timeline text' }];
		const node = makeAgentNode({
			result: 'Different result',
			timeline,
		});
		expect(getRenderableAgentResult(node)).toBe('Different result');
	});

	test('returns result when textContent is empty and timeline is empty', () => {
		const node = makeAgentNode({
			result: 'Unique result',
			textContent: '',
			timeline: [],
		});
		expect(getRenderableAgentResult(node)).toBe('Unique result');
	});

	test('returns trimmed result preserving original formatting', () => {
		const node = makeAgentNode({
			result: '  Result with leading space  ',
			textContent: 'Something else',
		});
		// result.trim() is called, so leading/trailing whitespace is stripped for the return
		expect(getRenderableAgentResult(node)).toBe('Result with leading space');
	});
});
