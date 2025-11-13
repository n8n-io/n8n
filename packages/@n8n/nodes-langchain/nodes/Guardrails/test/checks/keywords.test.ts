import { createKeywordsCheckFn } from '../../actions/checks/keywords';

describe('keywordsCheck', () => {
	it('should return the correct result', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['hello', 'world'] });
		const result = await checkFn('Hello, world!');
		expect(result.tripwireTriggered).toEqual(true);
	});

	it('should not match partial words', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['orld'] });
		const result = await checkFn('Hello, world!');
		expect(result.tripwireTriggered).toEqual(false);
	});

	it('should match numbers', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['world123'] });
		const result = await checkFn('Hello, world123');
		expect(result.tripwireTriggered).toEqual(true);
		expect(result.info.matchedKeywords).toEqual(['world123']);
	});

	it('should not match partial numbers', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['world123'] });
		const result = await checkFn('Hello, world12345');
		expect(result.tripwireTriggered).toEqual(false);
	});

	it('should match underscore', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['w_o_r_l_d'] });
		const result = await checkFn('Hello, w_o_r_l_d');
		expect(result.tripwireTriggered).toEqual(true);
		expect(result.info.matchedKeywords).toEqual(['w_o_r_l_d']);
	});

	it('should match in between underscore', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['world'] });
		const result = await checkFn('Hello, test_world_test');
		expect(result.tripwireTriggered).toEqual(true);
	});

	it('should work with chinese characters', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['你好'] });
		const result = await checkFn('你好');
		expect(result.tripwireTriggered).toEqual(true);
	});

	it('should work with chinese characters with numbers', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['你好123'] });
		const result = await checkFn('你好123');
		expect(result.tripwireTriggered).toEqual(true);
		expect(result.info.matchedKeywords).toEqual(['你好123']);
	});

	it('should not match partial chinese characters with numbers', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['你好123'] });
		const result = await checkFn('你好12345');
		expect(result.tripwireTriggered).toEqual(false);
	});
});
