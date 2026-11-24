/**
 * Tests for content extractor utilities
 */

import type { AIMessage as AIMessageType, BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

import {
	extractTextContent,
	extractThinkingContent,
	pushValidationFeedback,
} from '../content-extractors';

// Helper to create mock AIMessage (for extractText/Thinking tests that don't need instanceof)
function createMockMessage(
	content: string | Array<{ type: string; text?: string; thinking?: string }>,
): AIMessageType {
	return {
		content,
		_getType: () => 'ai',
	} as unknown as AIMessageType;
}

describe('extractTextContent', () => {
	it('should return string content directly', () => {
		const message = createMockMessage('Hello world');
		expect(extractTextContent(message)).toBe('Hello world');
	});

	it('should return null for empty string content', () => {
		const message = createMockMessage('');
		expect(extractTextContent(message)).toBeNull();
	});

	it('should extract text from array content blocks', () => {
		const message = createMockMessage([
			{ type: 'text', text: 'First part' },
			{ type: 'text', text: 'Second part' },
		]);
		expect(extractTextContent(message)).toBe('First part\nSecond part');
	});

	it('should ignore non-text blocks in array content', () => {
		const message = createMockMessage([
			{ type: 'text', text: 'Text content' },
			{ type: 'tool_use', text: 'should be ignored' },
		]);
		expect(extractTextContent(message)).toBe('Text content');
	});

	it('should return null for array with no text blocks', () => {
		const message = createMockMessage([{ type: 'tool_use' }]);
		expect(extractTextContent(message)).toBeNull();
	});

	it('should return null for empty array', () => {
		const message = createMockMessage([]);
		expect(extractTextContent(message)).toBeNull();
	});
});

describe('extractThinkingContent', () => {
	it('should extract <thinking> tags from text content', () => {
		const message = createMockMessage(
			'Some preamble <thinking>My thinking here</thinking> some more',
		);
		expect(extractThinkingContent(message)).toBe('My thinking here');
	});

	it('should extract multiple <thinking> blocks', () => {
		const message = createMockMessage(
			'<thinking>First thought</thinking> middle <thinking>Second thought</thinking>',
		);
		expect(extractThinkingContent(message)).toBe('First thought\n\nSecond thought');
	});

	it('should return null when no thinking tags present', () => {
		const message = createMockMessage('Just regular content');
		expect(extractThinkingContent(message)).toBeNull();
	});

	it('should extract from thinking content blocks in array', () => {
		const message = createMockMessage([
			{ type: 'text', text: 'Some text' },
			{ type: 'thinking', thinking: 'Extended thinking content' },
		]);
		expect(extractThinkingContent(message)).toBe('Extended thinking content');
	});

	it('should return null for empty content', () => {
		const message = createMockMessage('');
		expect(extractThinkingContent(message)).toBeNull();
	});
});

describe('pushValidationFeedback', () => {
	it('should convert string content to array with text and tool_use blocks', () => {
		const aiMessage = new AIMessage({ content: 'Some response' });
		const messages: BaseMessage[] = [aiMessage];

		pushValidationFeedback(messages, 'Validation feedback');

		expect(messages).toHaveLength(2);
		expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
		expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
		expect(messages[1]).toBeInstanceOf(ToolMessage);
		expect((messages[1] as ToolMessage).content).toBe('Validation feedback');
		// String content should be converted to array with text + tool_use blocks
		const content = (messages[0] as AIMessage).content as Array<Record<string, unknown>>;
		expect(Array.isArray(content)).toBe(true);
		expect(content).toHaveLength(2);
		expect(content[0]).toMatchObject({ type: 'text', text: 'Some response' });
		expect(content[1]).toMatchObject({
			type: 'tool_use',
			name: 'validate_workflow',
			input: {},
		});
		expect(content[1].id).toMatch(/^auto-validate-/);
		// ToolMessage should reference same ID
		const toolMessage = messages[1] as ToolMessage;
		expect(toolMessage.tool_call_id).toBe(content[1].id);
	});

	it('should inject tool_use block into content array when AIMessage has array content', () => {
		const aiMessage = new AIMessage({
			content: [
				{ type: 'thinking', thinking: 'some thought' },
				{ type: 'text', text: 'Some response' },
			],
		});
		const messages: BaseMessage[] = [aiMessage];

		pushValidationFeedback(messages, 'Validation feedback');

		expect(messages).toHaveLength(2);
		// Should have tool_calls set
		expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
		expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
		// Should have tool_use block in content array
		const content = (messages[0] as AIMessage).content as Array<Record<string, unknown>>;
		expect(content).toHaveLength(3);
		expect(content[2]).toMatchObject({
			type: 'tool_use',
			name: 'validate_workflow',
			input: {},
		});
		expect(content[2].id).toMatch(/^auto-validate-/);
		// ToolMessage should reference same ID
		const toolMessage = messages[1] as ToolMessage;
		expect(toolMessage.tool_call_id).toBe(content[2].id);
	});

	it('should append ToolMessage even when last message is not AIMessage', () => {
		const toolMsg = new ToolMessage({
			tool_call_id: 'existing',
			content: 'previous result',
		});
		const messages: BaseMessage[] = [toolMsg];

		pushValidationFeedback(messages, 'Validation feedback');

		expect(messages).toHaveLength(2);
		expect(messages[1]).toBeInstanceOf(ToolMessage);
		expect((messages[1] as ToolMessage).content).toBe('Validation feedback');
	});

	it('should append to existing tool_calls when AIMessage already has tool_calls', () => {
		const aiMessage = new AIMessage({ content: 'response' });
		aiMessage.tool_calls = [{ id: 'existing-id', name: 'some_tool', args: {} }];
		const messages: BaseMessage[] = [aiMessage];

		pushValidationFeedback(messages, 'feedback');

		expect((messages[0] as AIMessage).tool_calls).toHaveLength(2);
		expect((messages[0] as AIMessage).tool_calls![0].name).toBe('some_tool');
		expect((messages[0] as AIMessage).tool_calls![1].name).toBe('validate_workflow');
	});
});
