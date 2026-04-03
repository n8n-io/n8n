import {
	determineAllowedOrigin,
	isNullOrigin,
	normalizeOrigin,
} from '../cors-utils';

describe('CORS Utils', () => {
	describe('normalizeOrigin', () => {
		it('should return undefined for undefined input', () => {
			expect(normalizeOrigin(undefined)).toBeUndefined();
		});

		it('should return undefined for empty string', () => {
			expect(normalizeOrigin('')).toBeUndefined();
		});

		it('should normalize "null" string to undefined', () => {
			expect(normalizeOrigin('null')).toBeUndefined();
		});

		it('should return valid origin unchanged', () => {
			expect(normalizeOrigin('https://example.com')).toBe('https://example.com');
			expect(normalizeOrigin('http://localhost:3000')).toBe('http://localhost:3000');
		});
	});

	describe('isNullOrigin', () => {
		it('should return true for undefined', () => {
			expect(isNullOrigin(undefined)).toBe(true);
		});

		it('should return true for empty string', () => {
			expect(isNullOrigin('')).toBe(true);
		});

		it('should return true for "null" string', () => {
			expect(isNullOrigin('null')).toBe(true);
		});

		it('should return false for valid origins', () => {
			expect(isNullOrigin('https://example.com')).toBe(false);
			expect(isNullOrigin('http://localhost')).toBe(false);
		});
	});

	describe('determineAllowedOrigin', () => {
		describe('wildcard policy (*)', () => {
			it('should return * for null origin with wildcard policy', () => {
				expect(determineAllowedOrigin('*', undefined)).toBe('*');
				expect(determineAllowedOrigin('*', 'null')).toBe('*');
			});

			it('should return * for missing origin with wildcard policy', () => {
				expect(determineAllowedOrigin('*', undefined)).toBe('*');
			});

			it('should echo back valid origin with wildcard policy', () => {
				expect(determineAllowedOrigin('*', 'https://example.com')).toBe('https://example.com');
			});
		});

		describe('specific origins policy', () => {
			it('should return matching origin from allowed list', () => {
				expect(
					determineAllowedOrigin('https://example.com,https://test.com', 'https://example.com'),
				).toBe('https://example.com');
			});

			it('should return first allowed origin when request origin does not match', () => {
				expect(
					determineAllowedOrigin('https://example.com,https://test.com', 'https://unauthorized.com'),
				).toBe('https://example.com');
			});

			it('should handle null origin with specific origins policy', () => {
				expect(determineAllowedOrigin('https://example.com', 'null')).toBe('https://example.com');
				expect(determineAllowedOrigin('https://example.com', undefined)).toBe('https://example.com');
			});

			it('should trim whitespace from origins list', () => {
				expect(
					determineAllowedOrigin(' https://example.com , https://test.com ', 'https://test.com'),
				).toBe('https://test.com');
			});
		});

		describe('no policy', () => {
			it('should return * for null origin when no policy specified', () => {
				expect(determineAllowedOrigin(undefined, undefined)).toBe('*');
				expect(determineAllowedOrigin(undefined, 'null')).toBe('*');
			});

			it('should return * for missing origin when no policy specified', () => {
				expect(determineAllowedOrigin(undefined, undefined)).toBe('*');
			});

			it('should echo back valid origin when no policy specified', () => {
				expect(determineAllowedOrigin(undefined, 'https://example.com')).toBe('https://example.com');
			});
		});
	});
});
