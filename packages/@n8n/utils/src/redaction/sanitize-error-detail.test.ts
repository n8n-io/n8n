import { sanitizeErrorDetail } from './sanitize-error-detail';

describe('sanitizeErrorDetail', () => {
	it('scrubs secrets, strips URL queries case-insensitively, and caps output', () => {
		expect(sanitizeErrorDetail('token=secret', 512)).toBe('[REDACTED]');
		expect(
			sanitizeErrorDetail('request to HTTPS://api.example.com/v1?key=secret failed', 512),
		).toBe('request to HTTPS://api.example.com/v1 failed');
		expect(
			sanitizeErrorDetail('{"url":"https://api.example.com/v1?key=secret","code":401}', 512),
		).toBe('{"url":"https://api.example.com/v1","code":401}');
		expect(sanitizeErrorDetail('x'.repeat(20), 10)).toBe('x'.repeat(10));
	});

	it('strips the whole query when it contains quotes or apostrophes', () => {
		expect(
			sanitizeErrorDetail(
				'{"url":"https://api.example.com/v1?q=don\'t&sig=secret","code":401}',
				512,
			),
		).toBe('{"url":"https://api.example.com/v1","code":401}');
		expect(
			sanitizeErrorDetail('see https://api.example.com/v1?q=don\'t&sig="secret" now', 512),
		).toBe('see https://api.example.com/v1 now');
		expect(
			sanitizeErrorDetail('{"url":"https://api.example.com/v1?a=1\\"b=secret","code":401}', 512),
		).toBe('{"url":"https://api.example.com/v1","code":401}');
		expect(
			sanitizeErrorDetail("url 'https://api.example.com/v1?name=O'Brien&sig=secret' failed", 512),
		).toBe("url 'https://api.example.com/v1' failed");
	});

	it('handles many adjacent URL prefixes in linear time', () => {
		const start = performance.now();
		sanitizeErrorDetail('https://'.repeat(20_000), 512);
		expect(performance.now() - start).toBeLessThan(200);
	});
});
