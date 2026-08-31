import { sanitizeErrorDetail } from './sanitize-error-detail';

describe('sanitizeErrorDetail', () => {
	it('scrubs secrets, strips URL queries case-insensitively, and caps output', () => {
		expect(sanitizeErrorDetail('token=secret', 512)).toBe('[REDACTED]');
		expect(
			sanitizeErrorDetail('request to HTTPS://api.example.com/v1?key=secret failed', 512),
		).toBe('request to HTTPS://api.example.com/v1 failed');
		expect(sanitizeErrorDetail('x'.repeat(20), 10)).toBe('x'.repeat(10));
	});
});
