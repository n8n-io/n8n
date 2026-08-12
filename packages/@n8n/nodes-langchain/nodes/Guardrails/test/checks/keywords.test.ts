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

	it('should not match in between underscore', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['world'] });
		const result = await checkFn('Hello, test_world_test');
		expect(result.tripwireTriggered).toEqual(false);
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

	it('should apply word boundaries to all keywords in a multi-keyword pattern', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['test', 'hello', 'world'] });
		const result = await checkFn('testing hello world');
		expect(result.tripwireTriggered).toEqual(true);
		// Should match 'hello' and 'world', but NOT 'test' (which is part of 'testing')
		expect(result.info.matchedKeywords).toEqual(['hello', 'world']);
	});

	it('matches keywords that start with special characters embedded in text', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['@foo'] });
		const result = await checkFn('Reach me via example@foo.com later');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['@foo']);
	});

	it('matches keywords that start with # even when preceded by letters', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['#foo'] });
		const result = await checkFn('Use example#foo for the ID');
		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['#foo']);
	});

	it('ignores keywords that become empty after sanitization', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['!!!'] });
		const result = await checkFn('Totally benign text');
		expect(result.tripwireTriggered).toBe(false);
		expect(result.info?.matchedKeywords).toEqual([]);
	});

	it('still matches other keywords when some sanitize to empty strings', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['...', 'secret!!!'] });
		const result = await checkFn('Please keep this secret!');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['secret']);
	});

	it('matches keywords ending with special characters', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['foo@'] });
		const result = await checkFn('Use foo@ in the config');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['foo@']);
	});

	it('matches keywords ending with punctuation when followed by word characters', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['foo@'] });
		const result = await checkFn('Check foo@example');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['foo@']);
	});

	it('matches mixed script keywords', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['hello你好world'] });
		const result = await checkFn('Welcome to hello你好world section');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['hello你好world']);
	});

	it('does not match partial mixed script keywords', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['hello你好world'] });
		const result = await checkFn('This is hello你好worldextra');

		expect(result.tripwireTriggered).toBe(false);
	});

	it('matches Arabic characters', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['مرحبا'] });
		const result = await checkFn('مرحبا بك');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['مرحبا']);
	});

	it('matches Cyrillic characters', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['Привіт'] });
		const result = await checkFn('Привіт світ');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['Привіт']);
	});

	it('matches keywords with only punctuation', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['@@'] });
		const result = await checkFn('Use the @@ symbol');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['@@']);
	});

	it('matches mixed punctuation and alphanumeric keywords', async () => {
		const checkFn = createKeywordsCheckFn({ keywords: ['@user123@'] });
		const result = await checkFn('Contact via @user123@');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.matchedKeywords).toEqual(['@user123@']);
	});
});
