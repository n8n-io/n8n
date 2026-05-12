import { describe, it, expect } from 'vitest';
import { splitMarkdownIntoChunks, isWaitingForApproval } from './chat.utils';
import type { ChatMessage } from './chat.types';

describe('splitMarkdownIntoChunks', () => {
	it('should return empty array for empty string', () => {
		expect(splitMarkdownIntoChunks('')).toEqual([]);
	});

	it('should return single chunk for simple text', () => {
		const result = splitMarkdownIntoChunks('Hello world');
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('Hello world');
	});

	it('should split on two consecutive empty lines', () => {
		const content = 'First paragraph\n\n\nSecond paragraph';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(2);
		expect(result[0]).toBe('First paragraph');
		expect(result[1]).toBe('\nSecond paragraph');
	});

	it('should keep code blocks as single chunk even with double newlines inside', () => {
		const content = '```typescript\nconst x = 1;\n\nconst y = 2;\n```';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(content);
	});

	it('should split before headers', () => {
		const content = 'Some text\n\n# Header\nMore text';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(2);
		expect(result[0]).toBe('Some text');
		expect(result[1]).toBe('# Header\nMore text');
	});

	it('should handle multiple paragraphs and code blocks', () => {
		const content =
			'First paragraph\n\n\nSecond paragraph\n\n\n```js\ncode();\n```\n\n\nThird paragraph';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(4);
		expect(result[0]).toBe('First paragraph');
		expect(result[1]).toBe('\nSecond paragraph');
		expect(result[2]).toBe('\n```js\ncode();\n```');
		expect(result[3]).toBe('\n\nThird paragraph');
	});

	it('should handle escaped code blocks', () => {
		const content = '````markdown\n```python\nprint("Hello, World!")\n```\n````';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('````markdown\n```python\nprint("Hello, World!")\n```\n````');
	});

	it('should handle tilde code blocks', () => {
		const content = '~~~javascript\nconst x = 1;\n~~~';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('~~~javascript\nconst x = 1;\n~~~');
	});

	it('should handle nested tilde code blocks', () => {
		const content = '~~~~markdown\n~~~python\nprint("Hello")\n~~~\n~~~~';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('~~~~markdown\n~~~python\nprint("Hello")\n~~~\n~~~~');
	});

	it('should handle indented code blocks', () => {
		const content = 'Regular text\n\n    code()\n    more_code()\n\nMore text';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(3);
		expect(result[0]).toBe('Regular text');
		expect(result[1]).toBe('    code()\n    more_code()');
		expect(result[2]).toBe('More text');
	});

	it('should handle indented code blocks with blank lines', () => {
		const content = '    code()\n\n    more_code()';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('    code()\n\n    more_code()');
	});

	it('should handle tab-indented code blocks', () => {
		const content = 'Text\n\n\tcode()\n\tmore()\n\nMore text';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(3);
		expect(result[0]).toBe('Text');
		expect(result[1]).toBe('\tcode()\n\tmore()');
		expect(result[2]).toBe('More text');
	});

	it('should handle nested code blocks', () => {
		const content = '~~~markdown\n```python\nprint("Hello")\n```\n~~~';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(content);
	});

	it('should handle nested tab-indented code blocks', () => {
		const content = '```markdown\n    ```python\n    print("Hello")\n    ```\n```';
		const result = splitMarkdownIntoChunks(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(content);
	});
});

describe('isWaitingForApproval', () => {
	const createMessage = (
		status: ChatMessage['status'],
		content: ChatMessage['content'] = [],
	): ChatMessage => ({
		id: 'msg-1',
		sessionId: 'session-1',
		type: 'ai',
		name: 'AI',
		content,
		provider: 'openai',
		model: 'gpt-4',
		workflowId: null,
		agentId: null,
		executionId: null,
		status,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		previousMessageId: null,
		retryOfMessageId: null,
		revisionOfMessageId: null,
		attachments: [],
		responses: [],
		alternatives: [],
	});

	it('should return false when message is null', () => {
		expect(isWaitingForApproval(null)).toBe(false);
	});

	it('should return false when message is undefined', () => {
		expect(isWaitingForApproval(undefined)).toBe(false);
	});

	it('should return false when message status is not waiting', () => {
		const message = createMessage('success', [
			{
				type: 'with-buttons',
				content: 'Approve?',
				blockUserInput: true,
				buttons: [{ text: 'Yes', link: 'https://example.com', type: 'primary' }],
			},
		]);
		expect(isWaitingForApproval(message)).toBe(false);
	});

	it('should return false when message has no with-buttons chunk', () => {
		const message = createMessage('waiting', [{ type: 'text', content: 'Hello' }]);
		expect(isWaitingForApproval(message)).toBe(false);
	});

	it('should return false when with-buttons chunk has blockUserInput false', () => {
		const message = createMessage('waiting', [
			{
				type: 'with-buttons',
				content: 'Click a button',
				blockUserInput: false,
				buttons: [{ text: 'Click', link: 'https://example.com', type: 'primary' }],
			},
		]);
		expect(isWaitingForApproval(message)).toBe(false);
	});

	it('should return true when message has waiting status with blocking with-buttons chunk', () => {
		const message = createMessage('waiting', [
			{
				type: 'with-buttons',
				content: 'Please approve this action',
				blockUserInput: true,
				buttons: [
					{ text: 'Approve', link: 'https://example.com/approve', type: 'primary' },
					{ text: 'Reject', link: 'https://example.com/reject', type: 'secondary' },
				],
			},
		]);
		expect(isWaitingForApproval(message)).toBe(true);
	});

	it('should return true when with-buttons is among other content chunks', () => {
		const message = createMessage('waiting', [
			{ type: 'text', content: 'Some text before' },
			{
				type: 'with-buttons',
				content: 'Approve?',
				blockUserInput: true,
				buttons: [{ text: 'Yes', link: 'https://example.com', type: 'primary' }],
			},
		]);
		expect(isWaitingForApproval(message)).toBe(true);
	});
});
