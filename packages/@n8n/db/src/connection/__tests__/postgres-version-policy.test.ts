import {
	getPostgresVersionWarning,
	OLDEST_COMPATIBILITY_POSTGRES_MAJOR,
	OLDEST_SUPPORTED_POSTGRES_MAJOR,
} from '../postgres-version-policy';

describe('getPostgresVersionWarning', () => {
	it('should not warn for the oldest supported major', () => {
		expect(getPostgresVersionWarning(`${OLDEST_SUPPORTED_POSTGRES_MAJOR}.6`)).toBeNull();
	});

	it('should not warn for a major newer than the supported range', () => {
		expect(getPostgresVersionWarning(`${OLDEST_SUPPORTED_POSTGRES_MAJOR + 5}.0`)).toBeNull();
	});

	it('should warn about compatibility support for the compatibility major', () => {
		const warning = getPostgresVersionWarning(`${OLDEST_COMPATIBILITY_POSTGRES_MAJOR}.11`);

		expect(warning).toContain('compatibility support only');
		expect(warning).toContain(`Postgres ${OLDEST_COMPATIBILITY_POSTGRES_MAJOR}`);
	});

	it('should warn more sharply below the compatibility major', () => {
		const warning = getPostgresVersionWarning(`${OLDEST_COMPATIBILITY_POSTGRES_MAJOR - 1}.4`);

		expect(warning).toContain('is not supported');
		expect(warning).not.toContain('compatibility support only');
	});

	it('should treat pre-10 versions as unsupported', () => {
		expect(getPostgresVersionWarning('9.6')).toContain('is not supported');
	});

	it('should stay silent when the version cannot be parsed', () => {
		expect(getPostgresVersionWarning('CockroachDB CCL v23.1.11')).toBeNull();
		expect(getPostgresVersionWarning('')).toBeNull();
	});
});
