import postgresVersions from 'n8n-containers/postgres-versions.json';

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

// These thresholds and the DB test matrix move together every November.
describe('policy thresholds vs the versions CI tests', () => {
	const tested = postgresVersions.matrix;

	it('should stay silent for every fully supported major CI tests', () => {
		const supported = tested.filter(({ support }) => support === 'supported');

		for (const { major } of supported) {
			expect(getPostgresVersionWarning(`${major}.0`), `Postgres ${major}`).toBeNull();
		}
	});

	it('should warn about compatibility support only for the compatibility major CI tests', () => {
		const compatibility = tested.filter(({ support }) => support === 'compatibility');

		for (const { major } of compatibility) {
			expect(getPostgresVersionWarning(`${major}.0`), `Postgres ${major}`).toContain(
				'compatibility support only',
			);
		}
	});

	it('should treat the oldest tested major as the compatibility major', () => {
		const oldest = Math.min(...tested.map(({ major }) => major));

		expect(oldest).toBe(OLDEST_COMPATIBILITY_POSTGRES_MAJOR);
	});

	it('should treat the oldest fully supported tested major as the supported floor', () => {
		const supported = tested
			.filter(({ support }) => support === 'supported')
			.map(({ major }) => major);

		expect(Math.min(...supported)).toBe(OLDEST_SUPPORTED_POSTGRES_MAJOR);
	});
});
