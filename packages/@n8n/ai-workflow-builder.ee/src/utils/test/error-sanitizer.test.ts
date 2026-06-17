import { sanitizeLlmErrorMessage } from '../error-sanitizer';

const CLOUDFLARE_HTML = `403 <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<head><title>Attention Required! | Cloudflare</title></head>
<body><h1>Sorry, you have been blocked</h1>
<h2>You are unable to access n8n.io</h2></body></html>`;

describe('sanitizeLlmErrorMessage', () => {
	describe('HTML detection', () => {
		it('should return user-friendly message for Cloudflare HTML error with status 403', () => {
			const error = Object.assign(new Error(CLOUDFLARE_HTML), { status: 403 });

			const result = sanitizeLlmErrorMessage(error);

			expect(result).not.toContain('<!DOCTYPE');
			expect(result).not.toContain('<html');
			expect(result).toContain('blocked');
		});

		it('should return user-friendly message for HTML error without status code', () => {
			const error = new Error('<!DOCTYPE html><html><body>Error</body></html>');

			const result = sanitizeLlmErrorMessage(error);

			expect(result).not.toContain('<!DOCTYPE');
			expect(result).not.toContain('<html');
		});

		it('should detect <HTML> in uppercase', () => {
			const error = new Error('<HTML><BODY>Server Error</BODY></HTML>');

			const result = sanitizeLlmErrorMessage(error);

			expect(result).not.toContain('<HTML');
		});
	});

	describe('status code mapping', () => {
		it('should return 403-specific message for blocked requests', () => {
			const error = Object.assign(new Error(CLOUDFLARE_HTML), { status: 403 });

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toContain('blocked');
			expect(result).toContain('security filter');
		});

		it('should return rate limit message for 429', () => {
			const error = Object.assign(new Error('<html>Rate Limited</html>'), { status: 429 });

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toContain('Rate limit');
		});

		it('should return user-friendly message for 429 with short non-HTML message', () => {
			const error = Object.assign(
				new Error('You exceeded your current quota, please check your plan and billing details.'),
				{ status: 429 },
			);

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toContain('Rate limit');
			expect(result).not.toContain('quota');
			expect(result).not.toContain('billing');
		});

		it('should return service unavailable message for 502', () => {
			const error = Object.assign(new Error('<html>Bad Gateway</html>'), { status: 502 });

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toContain('temporarily unavailable');
		});

		it('should return service unavailable message for 503', () => {
			const error = Object.assign(new Error('<html>Service Unavailable</html>'), { status: 503 });

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toContain('temporarily unavailable');
		});

		it('should return internal error message for other 5xx status codes', () => {
			const error = Object.assign(new Error('<html>Error</html>'), { status: 500 });

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toContain('internal error');
		});
	});

	describe('passthrough for normal errors', () => {
		it('should pass through short, non-HTML error messages unchanged', () => {
			const error = new Error('Connection timeout');

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toBe('Connection timeout');
		});

		it('should pass through Anthropic API errors without HTML', () => {
			const error = new Error('401 Invalid API key');

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toBe('401 Invalid API key');
		});
	});

	describe('excessively long messages', () => {
		it('should replace messages longer than 500 characters with a generic message', () => {
			const error = new Error('x'.repeat(501));

			const result = sanitizeLlmErrorMessage(error);

			expect(result.length).toBeLessThan(500);
			expect(result).not.toBe('x'.repeat(501));
		});

		it('should keep messages at exactly 500 characters', () => {
			const msg = 'a'.repeat(500);
			const error = new Error(msg);

			const result = sanitizeLlmErrorMessage(error);

			expect(result).toBe(msg);
		});
	});

	describe('non-Error values', () => {
		it('should handle string thrown values', () => {
			const result = sanitizeLlmErrorMessage('something went wrong');

			expect(result).toBe('something went wrong');
		});

		it('should handle string with HTML', () => {
			const result = sanitizeLlmErrorMessage('<!DOCTYPE html><html>blocked</html>');

			expect(result).not.toContain('<!DOCTYPE');
		});

		it('should handle null', () => {
			const result = sanitizeLlmErrorMessage(null);

			expect(result).toBe('null');
		});

		it('should handle undefined', () => {
			const result = sanitizeLlmErrorMessage(undefined);

			expect(result).toBe('undefined');
		});
	});
});
