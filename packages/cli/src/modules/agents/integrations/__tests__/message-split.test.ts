import { splitMessage } from '../message-split';

describe('splitMessage', () => {
	it('keeps an emoji whole when it cuts a line', () => {
		const text = `x${'😀'.repeat(20)}`;

		expect(splitMessage(text, 20)).toEqual([`x${'😀'.repeat(9)}`, '😀'.repeat(10), '😀']);
	});
});
