import {
	cleanPlaceholderValue,
	composeCredentialNameWithUser,
	deriveServiceName,
	extractTemplateMarkers,
	markerPrefix,
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

	describe('markerPrefix', () => {
		it('returns the static text before the marker in the same string', () => {
			expect(markerPrefix(template, 'api_key')).toBe('Key ');
		});

		it('returns empty when the marker starts the string or is absent', () => {
			expect(markerPrefix(template, 'api_version')).toBe('');
			expect(markerPrefix(template, 'missing')).toBe('');
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

	describe('composeCredentialNameWithUser', () => {
		it('suffixes first name and last initial', () => {
			expect(
				composeCredentialNameWithUser('fal.ai API Key', { firstName: 'Jan', lastName: 'Doe' }),
			).toBe('fal.ai API Key (Jan D)');
		});

		it('suffixes first name alone when there is no last name', () => {
			expect(composeCredentialNameWithUser('fal.ai API Key', { firstName: 'Jan' })).toBe(
				'fal.ai API Key (Jan)',
			);
		});

		it('returns the base name when the user has no first name', () => {
			expect(composeCredentialNameWithUser('fal.ai API Key', { lastName: 'Doe' })).toBe(
				'fal.ai API Key',
			);
			expect(composeCredentialNameWithUser('fal.ai API Key', null)).toBe('fal.ai API Key');
		});
	});

	describe('deriveServiceName', () => {
		it('uses the recipe suggested name', () => {
			expect(deriveServiceName({ suggestedName: 'fal.ai API Key' })).toBe('fal.ai API Key');
		});

		it('returns undefined without a usable source', () => {
			expect(deriveServiceName({ suggestedName: '   ' })).toBeUndefined();
			expect(deriveServiceName(undefined)).toBeUndefined();
		});
	});
});
