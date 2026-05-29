import { describe, expect, test } from 'vitest';
import { appendChunkToParsedInstanceAiMarkdown, parseInstanceAiMarkdown } from '../markdownParser';

describe('markdownParser', () => {
	test('keeps partial artifact command tags hidden while streaming', () => {
		const parsed = appendChunkToParsedInstanceAiMarkdown([], 'Working <command:artifact-create');

		expect(parsed).toEqual([
			{ type: 'text', content: 'Working ' },
			{ type: 'hidden', content: '<command:artifact-create' },
		]);
	});

	test('continues an incomplete artifact command across chunks', () => {
		const first = appendChunkToParsedInstanceAiMarkdown([], '<command:artifact-create');
		const second = appendChunkToParsedInstanceAiMarkdown(
			first,
			'><title>Spec</title><type>markdown</type><content>Hello</content></command:artifact-create>',
		);

		expect(second).toEqual([
			expect.objectContaining({
				type: 'artifact-create',
				isIncomplete: false,
				command: { title: 'Spec', type: 'markdown', content: 'Hello' },
			}),
		]);
	});

	test('parses ordinary text without hidden chunks', () => {
		expect(parseInstanceAiMarkdown('Plain text')).toEqual([
			{ type: 'text', content: 'Plain text' },
		]);
	});
});
