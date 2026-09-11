import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { resetUserRegexEngine, safeRegex, safeUserRegex } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { RegexEngineService } from '../regex-engine.service';

// `(?R)` is PCRE2 recursion syntax that `new RegExp` rejects, so it tells the engines apart.
const PCRE2_ONLY_PATTERN = '\\((?:[^()]|(?R))*\\)';
const PCRE2_ONLY_SUBJECT = '(a(b))';

describe('pcre2 dialect', () => {
	let service: RegexEngineService;

	beforeAll(async () => {
		service = new RegexEngineService(
			mock<GlobalConfig>({ regexEngine: { engine: 'pcre2' } }),
			mock<Logger>(),
		);
		await service.init();
	});

	afterAll(() => {
		service.shutdown();
		resetUserRegexEngine();
	});

	it('runs a user\'s patterns under PCRE2', () => {
		expect(safeUserRegex.test(PCRE2_ONLY_PATTERN, PCRE2_ONLY_SUBJECT)).toBe(true);
	});

	it("leaves n8n's own patterns on the built-in engine", () => {
		expect(() => safeRegex.test(PCRE2_ONLY_PATTERN, PCRE2_ONLY_SUBJECT)).toThrow();
	});

	it('accepts the g, u and y flags a user\'s patterns carry', () => {
		// Without `jsFlags`, the engine throws "Unsupported regex flag" for each of these.
		expect(safeUserRegex.matchAll('a', 'aaa', 'g')).toHaveLength(3);
		expect(safeUserRegex.test('\\p{L}', 'é', 'u')).toBe(true);
		expect(safeUserRegex.exec('foo', 'xfoo', 'y')).toBeNull();
	});

	it('restores the built-in engine when it shuts down', async () => {
		const disposable = new RegexEngineService(
			mock<GlobalConfig>({ regexEngine: { engine: 'pcre2' } }),
			mock<Logger>(),
		);
		await disposable.init();

		disposable.shutdown();

		expect(() => safeUserRegex.test(PCRE2_ONLY_PATTERN, PCRE2_ONLY_SUBJECT)).toThrow();
	});
});
