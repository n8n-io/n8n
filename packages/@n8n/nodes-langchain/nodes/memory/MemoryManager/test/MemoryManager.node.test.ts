import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { simplifyMessages } from '../MemoryManager.node';

describe('simplifyMessages', () => {
	it('should handle single message', () => {
		const messages = [new HumanMessage('Hello')];
		const result = simplifyMessages(messages);
		expect(result).toEqual([{ human: 'Hello' }]);
	});

	it('should group different message types together', () => {
		const messages = [
			new HumanMessage('Hello, how are you?'),
			new AIMessage("I'm doing well, thank you for asking! How about you?"),
		];
		const result = simplifyMessages(messages);
		expect(result).toEqual([
			{
				human: 'Hello, how are you?',
				ai: "I'm doing well, thank you for asking! How about you?",
			},
		]);
	});

	it('should separate consecutive messages of same type into different groups', () => {
		const messages = [
			new HumanMessage('First human message'),
			new HumanMessage('Second human message'),
			new AIMessage('AI response'),
		];
		const result = simplifyMessages(messages);
		expect(result).toEqual([
			{ human: 'First human message' },
			{ human: 'Second human message', ai: 'AI response' },
		]);
	});

	it('should handle three consecutive messages of same type', () => {
		const messages = [new HumanMessage('1'), new HumanMessage('2'), new HumanMessage('3')];
		const result = simplifyMessages(messages);
		expect(result).toEqual([{ human: '1' }, { human: '2' }, { human: '3' }]);
	});

	it('should handle mixed message types with grouping', () => {
		const messages = [
			new SystemMessage('System message'),
			new HumanMessage('Hello'),
			new AIMessage('Hi there'),
			new HumanMessage('Another human message'),
			new AIMessage('Another AI message'),
		];
		const result = simplifyMessages(messages);
		expect(result).toEqual([
			{
				system: 'System message',
				human: 'Hello',
				ai: 'Hi there',
			},
			{
				human: 'Another human message',
				ai: 'Another AI message',
			},
		]);
	});

	it('should handle system messages correctly', () => {
		const messages = [
			new SystemMessage('System instruction'),
			new HumanMessage('User question'),
			new AIMessage('AI response'),
		];
		const result = simplifyMessages(messages);
		expect(result).toEqual([
			{
				system: 'System instruction',
				human: 'User question',
				ai: 'AI response',
			},
		]);
	});

	it('should handle alternating same types correctly', () => {
		const messages = [
			new HumanMessage('Human 1'),
			new AIMessage('AI 1'),
			new HumanMessage('Human 2'),
			new AIMessage('AI 2'),
		];
		const result = simplifyMessages(messages);
		expect(result).toEqual([
			{
				human: 'Human 1',
				ai: 'AI 1',
			},
			{
				human: 'Human 2',
				ai: 'AI 2',
			},
		]);
	});
});
