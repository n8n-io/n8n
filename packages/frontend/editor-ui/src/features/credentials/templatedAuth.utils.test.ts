import {
	cleanPlaceholderValue,
	extractTemplateMarkers,
	parsePlaceholderDefs,
	parsePlaceholderValues,
	parseTemplatedAuthField,
} from './templatedAuth.utils';

describe('templatedAuth.utils', () => {
	const template = {
		headers: { Authorization: 'Key {{api_key}}', 'api-version': '{{api_version}}' },
		qs: { key: '{{api_key}}' },
		body: { nested: { token: '{{api_key}}' } },
	};

	describe('extractTemplateMarkers', () => {
		it('collects markers depth-first, deduplicated in encounter order', () => {
			expect(extractTemplateMarkers(template)).toEqual(['api_key', 'api_version']);
		});

		it('returns empty for markerless or invalid templates', () => {
			expect(extractTemplateMarkers({ headers: { Accept: 'application/json' } })).toEqual([]);
			expect(extractTemplateMarkers(undefined)).toEqual([]);
		});
	});

	describe('cleanPlaceholderValue', () => {
		it('trims and strips a pasted duplicate of the template prefix', () => {
			expect(cleanPlaceholderValue(template, 'api_key', '  Key abc123  ')).toBe('abc123');
		});

		it('keeps values without the prefix intact', () => {
			expect(cleanPlaceholderValue(template, 'api_key', 'abc123')).toBe('abc123');
		});

		it('passes expressions through untouched', () => {
			expect(cleanPlaceholderValue(template, 'api_key', '={{ $secrets.vault.key }}')).toBe(
				'={{ $secrets.vault.key }}',
			);
		});
	});

	describe('parseTemplatedAuthField', () => {
		it('parses JSON strings and falls back on blanks and garbage', () => {
			expect(parseTemplatedAuthField('{"a":1}', {})).toEqual({ a: 1 });
			expect(parseTemplatedAuthField('', { fallback: true })).toEqual({ fallback: true });
			expect(parseTemplatedAuthField('not json', [])).toEqual([]);
			expect(parseTemplatedAuthField(undefined, [])).toEqual([]);
		});
	});

	describe('parsePlaceholderDefs', () => {
		it('keeps only entries with a string name', () => {
			const raw = JSON.stringify([
				{ name: 'api_key', title: 'API key' },
				{ title: 'nameless' },
				'junk',
			]);
			expect(parsePlaceholderDefs(raw)).toEqual([{ name: 'api_key', title: 'API key' }]);
		});
	});

	describe('parsePlaceholderValues', () => {
		it('keeps only string values', () => {
			const raw = JSON.stringify({ api_key: '***', nested: { no: true }, count: 2 });
			expect(parsePlaceholderValues(raw)).toEqual({ api_key: '***' });
		});
	});
});
