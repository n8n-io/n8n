import { fillPathSecret, REDACTED_SECRET, redactPathSecret } from '../path-secret';
import type { CapturedRequest } from '../network';

const PATTERN = /^(\/(?:file\/)?bot)([^/]+)/;
const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';

const url = (path: string) => new URL(`https://api.test${path}?x=1`);
const request = (path: string): CapturedRequest => ({
	method: 'POST',
	url: url(path),
	headers: {},
});

describe('redactPathSecret', () => {
	it('replaces the secret and returns it', () => {
		const out = redactPathSecret(url(`/bot${TOKEN}/sendMessage`), PATTERN);

		expect(out.secret).toBe(TOKEN);
		expect(out.url.pathname).toBe(`/bot${REDACTED_SECRET}/sendMessage`);
		expect(out.url.search).toBe('?x=1');
		expect(out.url.href).not.toContain(TOKEN);
	});

	it('also redacts the secret of a file path, and leaves the original url as it is', () => {
		const original = url(`/file/bot${TOKEN}/photos/a.jpg`);

		const out = redactPathSecret(original, PATTERN);

		expect(out.url.pathname).toBe(`/file/bot${REDACTED_SECRET}/photos/a.jpg`);
		expect(original.pathname).toContain(TOKEN);
	});

	it('changes nothing without a pattern, without a match, or when the secret is redacted', () => {
		const plain = url('/v1/things');
		const redacted = url(`/bot${REDACTED_SECRET}/getMe`);

		expect(redactPathSecret(plain, undefined)).toEqual({ url: plain });
		expect(redactPathSecret(plain, PATTERN)).toEqual({ url: plain });
		expect(redactPathSecret(redacted, PATTERN)).toEqual({ url: redacted });
	});
});

describe('fillPathSecret', () => {
	it('puts a secret in the place of the placeholder', () => {
		const out = fillPathSecret(request(`/bot${REDACTED_SECRET}/getChat`), PATTERN, TOKEN);

		expect(out.url.pathname).toBe(`/bot${TOKEN}/getChat`);
		expect(out.url.search).toBe('?x=1');
	});

	it('keeps the placeholder when it has no secret to put', () => {
		const req = request(`/bot${REDACTED_SECRET}/getChat`);

		expect(fillPathSecret(req, PATTERN, undefined)).toBe(req);
	});

	it('does not change a path that has no placeholder, so a token from a model stays as written', () => {
		const other = request('/bot999:model-wrote-this/getChat');

		expect(fillPathSecret(other, PATTERN, TOKEN)).toBe(other);
		expect(fillPathSecret(request('/v1/x'), PATTERN, TOKEN).url.pathname).toBe('/v1/x');
		expect(fillPathSecret(request('/v1/x'), undefined, TOKEN).url.pathname).toBe('/v1/x');
	});
});
