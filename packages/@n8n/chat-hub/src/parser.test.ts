/* eslint-disable n8n-local-rules/no-json-parse-json-stringify */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ChatMessageContentChunk } from '@n8n/api-types';
import assert from 'assert';

import { parseMessage, appendChunkToParsedMessageItems } from './parser';

describe(parseMessage, () => {
	it('should parse text', () => {
		expect(parseMessage({ type: 'ai', content: 'hello' })).toEqual([
			{ type: 'text', content: 'hello' },
		]);
	});

	it('should parse non-ai message as text', () => {
		expect(parseMessage({ type: 'human', content: '<command:artifact-create>' })).toEqual([
			{ type: 'text', content: '<command:artifact-create>' },
		]);
	});

	it('should parse artifact-create command', () => {
		const content = `Here is a document:

<command:artifact-create>
<title>My Document</title>
<type>md</type>
<content>
# Hello World
This is a test.
</content>
</command:artifact-create>

Done!`;

		const result = parseMessage({ type: 'ai', content });
		expect(result).toEqual([
			{ type: 'text', content: 'Here is a document:\n\n' },
			{
				type: 'artifact-create',
				content: `<command:artifact-create>
<title>My Document</title>
<type>md</type>
<content>
# Hello World
This is a test.
</content>
</command:artifact-create>`,
				command: {
					title: 'My Document',
					type: 'md',
					content: '\n# Hello World\nThis is a test.\n',
				},
				isIncomplete: false,
			},
			{ type: 'text', content: '\n\nDone!' },
		]);
	});

	it('should parse artifact-edit command', () => {
		const content = `<command:artifact-edit>
<title>My Document</title>
<oldString>old text</oldString>
<newString>new text</newString>
<replaceAll>true</replaceAll>
</command:artifact-edit>`;

		const result = parseMessage({ type: 'ai', content });
		expect(result).toEqual([
			{
				type: 'artifact-edit',
				content,
				command: {
					title: 'My Document',
					oldString: 'old text',
					newString: 'new text',
					replaceAll: true,
				},
				isIncomplete: false,
			},
		]);
	});
});

describe(appendChunkToParsedMessageItems, () => {
	it('should append text chunk to empty items', () => {
		const result = appendChunkToParsedMessageItems([], 'hello');
		expect(result).toEqual([{ type: 'text', content: 'hello' }]);
	});

	it('should append text chunk to existing text', () => {
		const items: ChatMessageContentChunk[] = [{ type: 'text', content: 'hello' }];
		const result = appendChunkToParsedMessageItems(items, ' world');
		expect(result).toEqual([{ type: 'text', content: 'hello world' }]);
	});

	it('should ignore potential prefix of command', () => {
		const result = appendChunkToParsedMessageItems([], 'here: <com');
		expect(result).toEqual([
			{ type: 'text', content: 'here: ' },
			{ type: 'hidden', content: '<com' },
		]);
	});

	it('should handle artifact-create command divided into multiple chunks', () => {
		const result1 = appendChunkToParsedMessageItems([], '<comman');
		const result2 = appendChunkToParsedMessageItems(result1, 'd:artifact-create>\n<title>Test');

		expect(result2).toEqual([
			{
				type: 'artifact-create',
				content: '<command:artifact-create>\n<title>Test',
				command: { title: 'Test', type: '', content: '' },
				isIncomplete: true,
			},
		]);
	});

	it('should handle incomplete artifact-create command', () => {
		const result = appendChunkToParsedMessageItems([], '<command:artifact-create>\n<title>Test');
		expect(result).toEqual([
			{
				type: 'artifact-create',
				content: '<command:artifact-create>\n<title>Test',
				command: { title: 'Test', type: '', content: '' },
				isIncomplete: true,
			},
		]);
	});

	it('should handle incomplete artifact-create command with incomplete closing tag', () => {
		const result = appendChunkToParsedMessageItems([], '<command:artifact-create>\n<title>Test</t');
		expect(result).toEqual([
			{
				type: 'artifact-create',
				content: '<command:artifact-create>\n<title>Test</t',
				command: { title: 'Test', type: '', content: '' },
				isIncomplete: true,
			},
		]);
	});

	it('should handle incomplete artifact-create command starting in the middle of chunk', () => {
		const result = appendChunkToParsedMessageItems(
			[],
			'here: <command:artifact-create>\n<title>Test',
		);
		expect(result).toEqual([
			{ type: 'text', content: 'here: ' },
			{
				type: 'artifact-create',
				content: '<command:artifact-create>\n<title>Test',
				command: { title: 'Test', type: '', content: '' },
				isIncomplete: true,
			},
		]);
	});

	it('should complete an incomplete artifact-create command', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command:artifact-create>\n<title>Test',
				command: { title: 'Test', type: '', content: '' },
				isIncomplete: true,
			},
		];

		const result = appendChunkToParsedMessageItems(
			items,
			'</title>\n<type>md</type>\n<content>Content here</content>\n</command:artifact-create>',
		);
		expect(result).toEqual([
			{
				type: 'artifact-create',
				content: `<command:artifact-create>
<title>Test</title>
<type>md</type>
<content>Content here</content>
</command:artifact-create>`,
				command: {
					title: 'Test',
					type: 'md',
					content: 'Content here',
				},
				isIncomplete: false,
			},
		]);
	});

	it('should handle incomplete artifact-edit command', () => {
		const result = appendChunkToParsedMessageItems(
			[],
			'<command:artifact-edit>\n<title>My Doc</title>\n<oldString>',
		);
		expect(result).toEqual([
			{
				type: 'artifact-edit',
				content: '<command:artifact-edit>\n<title>My Doc</title>\n<oldString>',
				command: { title: 'My Doc', oldString: '', newString: '', replaceAll: false },
				isIncomplete: true,
			},
		]);
	});

	it('should complete an incomplete artifact-edit command', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-edit',
				content: '<command:artifact-edit>\n<title>Doc</title>\n<oldString>old',
				command: { title: 'Doc', oldString: 'old', newString: '', replaceAll: false },
				isIncomplete: true,
			},
		];

		const result = appendChunkToParsedMessageItems(
			items,
			'</oldString>\n<newString>new</newString>\n<replaceAll>false</replaceAll>\n</command:artifact-edit>',
		);
		expect(result).toEqual([
			{
				type: 'artifact-edit',
				content: `<command:artifact-edit>
<title>Doc</title>
<oldString>old</oldString>
<newString>new</newString>
<replaceAll>false</replaceAll>
</command:artifact-edit>`,
				command: {
					title: 'Doc',
					oldString: 'old',
					newString: 'new',
					replaceAll: false,
				},
				isIncomplete: false,
			},
		]);
	});

	it('should handle multiple commands in sequence', () => {
		const content = `<command:artifact-create>
<title>Doc1</title>
<type>md</type>
<content>Content 1</content>
</command:artifact-create>
<command:artifact-edit>
<title>Doc1</title>
<oldString>Content 1</oldString>
<newString>Updated Content</newString>
<replaceAll>false</replaceAll>
</command:artifact-edit>`;

		const result = appendChunkToParsedMessageItems([], content);
		expect(result).toHaveLength(2);
		expect(result[0].type).toBe('artifact-create');
		expect(result[1].type).toBe('artifact-edit');
	});

	it('should handle streaming scenario with text before command', () => {
		let items: ChatMessageContentChunk[] = [];

		// Chunk 1: Text before command
		items = appendChunkToParsedMessageItems(items, 'Here is a document:\n\n');
		expect(items).toEqual([{ type: 'text', content: 'Here is a document:\n\n' }]);

		// Chunk 2: Start of command
		items = appendChunkToParsedMessageItems(items, '<command:artifact-create>\n<title>');
		expect(items).toHaveLength(2);
		expect(items[1].type).toBe('artifact-create');
		assert(items[1].type === 'artifact-create');
		expect(items[1].isIncomplete).toBe(true);

		// Chunk 3: Complete the command
		items = appendChunkToParsedMessageItems(
			items,
			'Test</title>\n<type>md</type>\n<content>Hello</content>\n</command:artifact-create>',
		);
		expect(items).toHaveLength(2);
		expect(items[1].type).toBe('artifact-create');
		assert(items[1].type === 'artifact-create');
		expect(items[1].isIncomplete).toBe(false);
	});

	describe('immutability (pure function behavior)', () => {
		it('should not mutate input items array with incomplete commands', () => {
			const originalItems: ChatMessageContentChunk[] = [
				{
					type: 'artifact-create',
					content: '<command:artifact-create>\n<title>Test',
					command: { title: 'Test', type: '', content: '' },
					isIncomplete: true,
				},
			];

			// Deep clone to compare later
			const clonedOriginal = JSON.parse(JSON.stringify(originalItems));

			const result = appendChunkToParsedMessageItems(
				originalItems,
				'</title>\n<type>md</type>\n<content>Content</content>\n</command:artifact-create>',
			);

			// Original should remain unchanged
			expect(originalItems).toEqual(clonedOriginal);

			// Result should have the updated item
			expect(result).toHaveLength(1);
			assert(result[0].type === 'artifact-create');
			expect(result[0].isIncomplete).toBe(false);
			expect(result[0].command.type).toBe('md');
		});

		it('should not mutate hidden items', () => {
			const originalItems: ChatMessageContentChunk[] = [
				{ type: 'text', content: 'hello' },
				{ type: 'hidden', content: '<com' },
			];

			const clonedOriginal = JSON.parse(JSON.stringify(originalItems));

			const result = appendChunkToParsedMessageItems(originalItems, 'mand:artifact-create>');

			// Original should remain unchanged
			expect(originalItems).toEqual(clonedOriginal);

			// Result should have parsed the command
			expect(result).toHaveLength(2);
			expect(result[0].type).toBe('text');
			expect(result[1].type).toBe('artifact-create');
		});

		it('should not mutate text items when appending more text', () => {
			const originalItems: ChatMessageContentChunk[] = [{ type: 'text', content: 'hello' }];

			const clonedOriginal = JSON.parse(JSON.stringify(originalItems));

			const result = appendChunkToParsedMessageItems(originalItems, ' world');

			// Original should remain unchanged
			expect(originalItems).toEqual(clonedOriginal);
			expect(originalItems[0].content).toBe('hello');

			// Result should have concatenated text
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('text');
			expect(result[0].content).toBe('hello world');
		});
	});
});
