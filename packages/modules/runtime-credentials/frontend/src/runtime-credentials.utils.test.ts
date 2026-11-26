import {
	buildPresetPath,
	buildSampleRequest,
	detectPathPreset,
	findInvalidAllowedDomain,
	findPathProblem,
	findRuleIssue,
	getFillableFields,
	isOAuth2Type,
	normalizeAllowedDomains,
	parseAllowedDomains,
	stepForServerReason,
	toAlias,
	uniqueAlias,
} from './runtime-credentials.utils';

describe('allowed domains helpers', () => {
	it('parses and normalizes a comma separated list', () => {
		expect(parseAllowedDomains(' a.com ,, *.b.com ')).toEqual(['a.com', '*.b.com']);
		expect(parseAllowedDomains(null)).toEqual([]);
		expect(normalizeAllowedDomains(' a.com ,, *.b.com ')).toBe('a.com, *.b.com');
		expect(normalizeAllowedDomains('  , ')).toBe('');
	});

	it('accepts bare hosts and wildcards', () => {
		expect(findInvalidAllowedDomain('api.example.com, *.example.com')).toBeUndefined();
		expect(findInvalidAllowedDomain('')).toBeUndefined();
	});

	it.each(['https://a.com', 'a.com/x', 'a.com:443', 'u@a.com', 'a\\b', 'a b.com'])(
		'rejects %s',
		(entry) => {
			expect(findInvalidAllowedDomain(`ok.com, ${entry}`)).toBe(entry);
		},
	);
});

describe('path helpers', () => {
	it('finds path problems', () => {
		expect(findPathProblem('')).toBe('empty');
		expect(findPathProblem('a..b')).toBe('emptySegment');
		expect(findPathProblem('a.__proto__')).toBe('unsafe');
		expect(findPathProblem('a.constructor[*]')).toBe('unsafe');
		expect(findPathProblem('headers.x-token')).toBeUndefined();
	});

	it('round-trips presets', () => {
		expect(detectPathPreset('headers.authorization')).toEqual({
			preset: 'authorization',
			name: '',
		});
		expect(detectPathPreset('headers.x-token')).toEqual({ preset: 'header', name: 'x-token' });
		expect(detectPathPreset('body.a.b')).toEqual({ preset: 'body', name: 'a.b' });
		expect(detectPathPreset('query.t')).toEqual({ preset: 'query', name: 't' });
		expect(detectPathPreset('something.else')).toEqual({ preset: 'custom', name: '' });
		expect(buildPresetPath('header', ' X-Token ')).toBe('headers.x-token');
		expect(buildPresetPath('body', 'a.b')).toBe('body.a.b');
		expect(buildPresetPath('query', '')).toBe('');
	});

	it('builds a sample request with the read value marked', () => {
		const marked = (path: string) =>
			buildSampleRequest(path)
				.flat()
				.filter((part) => part.mark)
				.map((part) => part.text);

		expect(marked('headers.authorization')).toEqual(['Authorization: Bearer <secret>']);
		expect(marked('query.token')).toEqual(['token=<secret>']);
		expect(marked('body.a.b')).toEqual(['    "b": "<secret>"']);
		expect(marked('other.c')).toEqual(['    "c": "<secret>"']);
		expect(buildSampleRequest('')).toEqual([]);
	});
});

describe('credential helpers', () => {
	const property = (name: string, type = 'string') => ({ name, displayName: name, type });
	const catalog = new Map(
		[
			{ name: 'oAuth2Api', displayName: 'OAuth2', properties: [property('clientId')] },
			{
				name: 'child',
				displayName: 'Child',
				extends: ['oAuth2Api'],
				properties: [property('own')],
			},
			{
				name: 'plain',
				displayName: 'Plain',
				properties: [
					property('apiKey'),
					property('hidden1', 'hidden'),
					property('flag', 'boolean'),
					property('allowedDomains'),
				],
			},
		].map((type) => [type.name, type]),
	);

	it('detects OAuth2 types through parents', () => {
		expect(isOAuth2Type('child', catalog)).toBe(true);
		expect(isOAuth2Type('plain', catalog)).toBe(false);
	});

	it('lists only fields that can take a request value', () => {
		expect(getFillableFields('plain', catalog).map(({ name }) => name)).toEqual(['apiKey']);
		expect(getFillableFields('child', catalog).map(({ name }) => name)).toEqual(['own']);
	});

	it('finds a rule issue', () => {
		expect(findRuleIssue({ credentialType: 'nope' }, catalog)).toEqual({
			kind: 'unknownType',
			type: 'nope',
		});
		expect(findRuleIssue({ credentialType: 'plain', transform: 'field:missing' }, catalog)).toEqual(
			{
				kind: 'unknownField',
				type: 'plain',
				field: 'missing',
			},
		);
		expect(findRuleIssue({ credentialType: 'plain', transform: 'field:hidden1' }, catalog)).toEqual(
			{
				kind: 'controlledField',
				type: 'plain',
				field: 'hidden1',
			},
		);
		expect(
			findRuleIssue({ credentialType: 'plain', transform: 'field:allowedDomains' }, catalog),
		).toMatchObject({
			kind: 'controlledField',
		});
		expect(
			findRuleIssue({ credentialType: 'plain', transform: 'field:apiKey' }, catalog),
		).toBeUndefined();
		expect(
			findRuleIssue({ credentialType: 'plain', transform: 'bearer' }, catalog),
		).toBeUndefined();
		// With no type list loaded, nothing can be checked.
		expect(findRuleIssue({ credentialType: 'nope' }, new Map())).toBeUndefined();
	});
});

describe('alias helpers', () => {
	it('builds an alias', () => {
		expect(toAlias('gmailOAuth2')).toBe('gmail-oauth2');
		expect(toAlias(' Hello  World! ')).toBe('hello-world');
	});

	it('makes an alias unique', () => {
		expect(uniqueAlias('google-token', [])).toBe('google-token');
		expect(uniqueAlias('google-token', ['google-token', 'google-token-2'])).toBe('google-token-3');
		expect(uniqueAlias('', [])).toBe('rule');
	});
});

describe('stepForServerReason', () => {
	it('maps reasons to wizard steps', () => {
		expect(stepForServerReason('Unknown credential type "x"')).toBe('credential');
		expect(stepForServerReason('Credential type "x" has no field "y"')).toBe('credential');
		expect(stepForServerReason('The path has an unsafe segment')).toBe('source');
		expect(stepForServerReason('"a/b" must be a host only')).toBe('endpoints');
		expect(stepForServerReason('something else')).toBeUndefined();
	});
});
