import type { INodeProperties } from 'n8n-workflow';
import {
	collectPasswordNames,
	formatVersionChangeValue,
	getNodeVersionChoices,
} from './nodeVersionPicker.utils';

const hides =
	(...hidden: number[]) =>
	(version: number) =>
		hidden.includes(version);

describe('getNodeVersionChoices', () => {
	it('sorts the versions numerically, highest first', () => {
		expect(getNodeVersionChoices([1, 4.5, 3, 4.1, 2], hides(), 3, 4.5).listed).toEqual([
			4.5, 4.1, 3, 2, 1,
		]);
	});

	it('drops a hidden version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(2), 1, 3).listed).toEqual([3, 1]);
	});

	it('keeps a hidden version when it is the current version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(2), 2, 3).listed).toEqual([3, 2, 1]);
	});

	it('uses the default version as latest', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(), 1, 2).latest).toBe(2);
	});

	it('falls back to the highest listed version when the default version is hidden', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(3), 1, 3).latest).toBe(2);
	});

	it('falls back to the highest listed version when there is no default version', () => {
		expect(getNodeVersionChoices([1, 3, 2], hides(), 1, undefined).latest).toBe(3);
	});

	it('does not use a hidden current version as latest', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(3), 3, undefined)).toEqual({
			latest: 2,
			listed: [3, 2, 1],
		});
	});

	it('returns no choices for no versions', () => {
		expect(getNodeVersionChoices([], hides(), 1, 1)).toEqual({ latest: undefined, listed: [] });
	});
});

describe('collectPasswordNames', () => {
	it('finds password parameters at the top level, in a collection and in a fixed collection', () => {
		const properties: INodeProperties[] = [
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Proxy Password',
						name: 'proxyPassword',
						type: 'string',
						typeOptions: { password: true },
						default: '',
					},
				],
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Header',
						name: 'header',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{
								displayName: 'Secret',
								name: 'secret',
								type: 'string',
								typeOptions: { password: true },
								default: '',
							},
						],
					},
				],
			},
		];

		expect(collectPasswordNames(properties)).toEqual(
			new Set(['apiKey', 'proxyPassword', 'secret']),
		);
	});
});

describe('formatVersionChangeValue', () => {
	const methodOptions = (options: Array<{ name: string; value: string }>): INodeProperties => ({
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: '',
		options,
	});
	const properties = [
		methodOptions([{ name: 'Get It', value: 'get' }]),
		methodOptions([{ name: 'Post It', value: 'post' }]),
	];
	const noPasswords = new Set<string>();

	it.each([
		[0, '0'],
		['', ''],
		[null, 'null'],
		[true, 'true'],
	])('formats %j as %j', (value, expected) => {
		expect(formatVersionChangeValue(value, ['other'], properties, noPasswords)).toBe(expected);
	});

	it('shows the display name of a top-level option', () => {
		expect(formatVersionChangeValue('get', ['method'], properties, noPasswords)).toBe('Get It');
	});

	it('finds the option in a later parameter with the same name', () => {
		expect(formatVersionChangeValue('post', ['method'], properties, noPasswords)).toBe('Post It');
	});

	it('shows the raw value of an unknown option', () => {
		expect(formatVersionChangeValue('patch', ['method'], properties, noPasswords)).toBe('patch');
	});

	it('shows the raw value of a nested option', () => {
		expect(formatVersionChangeValue('get', ['options', 'method'], properties, noPasswords)).toBe(
			'get',
		);
	});

	it('formats an object as JSON', () => {
		expect(
			formatVersionChangeValue({ retries: 3, tags: ['a'] }, ['options'], properties, noPasswords),
		).toBe('{"retries":3,"tags":["a"]}');
	});

	it('masks a nested value whose name is a password parameter', () => {
		expect(
			formatVersionChangeValue(
				'hunter2',
				['headers', 'header', 0, 'secret'],
				properties,
				new Set(['secret']),
			),
		).toBe('••••••');
	});

	it('masks a password key inside an object value', () => {
		expect(
			formatVersionChangeValue(
				{ header: [{ name: 'X-Key', secret: 'hunter2' }] },
				['headers'],
				properties,
				new Set(['secret']),
			),
		).toBe('{"header":[{"name":"X-Key","secret":"••••••"}]}');
	});
});
