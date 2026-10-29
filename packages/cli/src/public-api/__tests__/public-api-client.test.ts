import { resolvePublicApiClient } from '@/public-api/public-api-client';

describe('resolvePublicApiClient', () => {
	it.each([
		['editor_ui', 'editor-ui'],
		['other', 'other'],
	])(
		'returns the %s telemetry value for the $s marker value',
		(expectedTelemetryValue, received) => {
			expect(resolvePublicApiClient(received)).toBe(expectedTelemetryValue);
		},
	);

	it('ignores case and surrounding whitespace', () => {
		expect(resolvePublicApiClient(' Editor-UI ')).toBe('editor_ui');
	});

	it('returns other for an unknown value', () => {
		expect(resolvePublicApiClient('foo')).toBe('other');
	});

	it('returns other when the header is absent', () => {
		expect(resolvePublicApiClient(undefined)).toBe('other');
	});

	it('uses the first value of a repeated header', () => {
		expect(resolvePublicApiClient(['editor-ui', 'foo'])).toBe('editor_ui');
		expect(resolvePublicApiClient(['foo', 'editor-ui'])).toBe('other');
	});
});
