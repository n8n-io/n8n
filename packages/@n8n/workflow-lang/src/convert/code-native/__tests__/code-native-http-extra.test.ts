/**
 * Option shapes of `this.helpers.httpRequest` and `helpers.httpRequest` not
 * covered by `code-native-http.test.ts`: template literal URLs, direct calls
 * on a constant that holds the helper, and non-string body types.
 */
import { describe, expect, it } from 'vitest';

import { checkTranslation } from '../check.ts';
import { translateCode } from '../translate.ts';

/** True when the code translates and compiles to a native form. */
function ok(code: string): boolean {
	const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
	if (!t.ok) return false;
	const c = checkTranslation(t.translation, 'all');
	return c.ok;
}

/**
 * Returns the blocker messages when the code does not translate, or empty array.
 * The code uses `{URL}` as a placeholder for a real URL so the checker does not
 * block on the URL value.
 */
function blockersOf(code: string): string[] {
	const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
	return t.ok ? [] : t.blockers.map((b) => b.message);
}

const URL = "'http://127.0.0.1/x'";

describe('this.helpers.httpRequest: additional option shapes', () => {
	it('translates a request with a template literal URL', () => {
		const code = `const r = await this.helpers.httpRequest({ url: \`${URL}/json\` }); return [{ json: r }];`;
		expect(ok(code)).toBe(true);
	});

	it('translates a request through a constant that holds the helper', () => {
		const code = `const req = this.helpers.httpRequest; const r = await req({ url: ${URL} }); return [{ json: r }];`;
		expect(ok(code)).toBe(true);
	});

	it('translates helpers.httpRequest with a template URL', () => {
		const code = `const r = await helpers.httpRequest({ url: \`${URL}/text\` }); return [{ json: r }];`;
		expect(ok(code)).toBe(true);
	});

	it('translates a POST with a boolean body', () => {
		const code = `const r = await this.helpers.httpRequest({ method: 'POST', url: ${URL}, body: true }); return [{ json: r }];`;
		expect(ok(code)).toBe(true);
	});

	it('translates a POST with a number body', () => {
		const code = `const r = await this.helpers.httpRequest({ method: 'POST', url: ${URL}, body: 42 }); return [{ json: r }];`;
		expect(ok(code)).toBe(true);
	});

	it('translates a request with template literal headers', () => {
		const code = `const r = await this.helpers.httpRequest({ url: ${URL}, headers: { 'X-User': \`user-1\` } }); return [{ json: r }];`;
		expect(ok(code)).toBe(true);
	});
});

describe('this.helpers.httpRequest: shapes kept in the host', () => {
	it('keeps a request with encoding arraybuffer in the host', () => {
		const code = `const r = await this.helpers.httpRequest({ url: ${URL}, encoding: 'arraybuffer' }); return [{ json: r }];`;
		expect(ok(code)).toBe(false);
	});

	it('keeps a request with the legacy request helper in the host', () => {
		const code = `const r = await this.helpers.request({ url: ${URL} }); return [{ json: r }];`;
		expect(blockersOf(code)).not.toEqual([]);
	});

	it('keeps a multipart body in the host', () => {
		const code = `const r = await this.helpers.httpRequest({ method: 'POST', url: ${URL}, headers: { 'content-type': 'multipart/form-data' }, body: { a: 1 } }); return [{ json: r }];`;
		expect(ok(code)).toBe(false);
	});
});