import { HumanMessage, AIMessage } from '@langchain/core/messages';

import { isLangchainMessagesArray } from '../../session-storage';

describe('isLangchainMessagesArray', () => {
	it('returns true for an array of langchain messages', () => {
		const messages = [new HumanMessage('hi'), new AIMessage('hello')];
		expect(isLangchainMessagesArray(messages)).toBe(true);
	});

	it('returns true for an empty array', () => {
		expect(isLangchainMessagesArray([])).toBe(true);
	});

	it('returns false for non-arrays', () => {
		expect(isLangchainMessagesArray(null)).toBe(false);
		expect(isLangchainMessagesArray(undefined)).toBe(false);
		expect(isLangchainMessagesArray({})).toBe(false);
		expect(isLangchainMessagesArray('hi')).toBe(false);
	});

	it('returns false for an array containing non-message values', () => {
		expect(isLangchainMessagesArray([new HumanMessage('hi'), 'not a message'])).toBe(false);
	});
});
