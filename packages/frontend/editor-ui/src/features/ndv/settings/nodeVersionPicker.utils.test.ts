import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { MASK } from '@/app/utils/maskSecret';
import {
	collectPasswordNames,
	formatVersionChangeValue,
	getNewParameterPaths,
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

	it('drops a version above the latest version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(), 1, 2).listed).toEqual([2, 1]);
	});

	it('keeps a version above the latest version when it is the current version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(), 3, 2).listed).toEqual([3, 2, 1]);
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
		).toBe(MASK);
	});

	it.each([
		['a top-level password parameter', ['apiKey'], 'apiKey'],
		['an item of a password parameter', ['secrets', 0], 'secrets'],
	])('masks %s', (_, path, passwordName) => {
		expect(formatVersionChangeValue('hunter2', path, properties, new Set([passwordName]))).toBe(
			MASK,
		);
	});

	it('masks a password key inside an object value', () => {
		expect(
			formatVersionChangeValue(
				{ header: [{ name: 'X-Key', secret: 'hunter2' }] },
				['headers'],
				properties,
				new Set(['secret']),
			),
		).toBe(`{"header":[{"name":"X-Key","secret":"${MASK}"}]}`);
	});
});

describe('getNewParameterPaths', () => {
	const type = (properties: INodeProperties[]) =>
		({ name: 'test', properties }) as INodeTypeDescription;
	const text = (name: string, extra: Partial<INodeProperties> = {}): INodeProperties => ({
		displayName: name,
		name,
		type: 'string',
		default: '',
		...extra,
	});
	const collection = (name: string, options: INodeProperties[]): INodeProperties => ({
		displayName: name,
		name,
		type: 'collection',
		default: {},
		options,
	});
	const fromVersion2 = { '@version': [{ _cnd: { gte: 2 } }] };

	it('returns a top-level parameter that only the new description has', () => {
		const oldType = type([text('url')]);
		const newType = type([
			text('url'),
			text('added', { displayOptions: { show: { resource: ['x'] } } }),
		]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['added']);
	});

	it('returns a parameter that a shared description shows from the new version', () => {
		const shared = type([
			text('url'),
			text('added', { displayOptions: { show: { ...fromVersion2, '/other': [true] } } }),
		]);

		expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual(['added']);
	});

	it('does not return a same-named replacement of a parameter that the new version hides', () => {
		const shared = type([
			text('mode', { displayOptions: { hide: fromVersion2 } }),
			text('mode', { displayOptions: { show: fromVersion2 } }),
		]);

		expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual([]);
	});

	it('returns a parameter that is hidden in the old version', () => {
		const oldType = type([text('added', { type: 'hidden' })]);
		const newType = type([text('added')]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['added']);
	});

	it('returns a new option of a collection that both versions have', () => {
		const shared = type([
			collection('options', [
				text('removed', { displayOptions: { hide: fromVersion2 } }),
				text('added', { displayOptions: { show: { ...fromVersion2, '/other': [true] } } }),
				text('kept'),
			]),
		]);

		expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual(['options.added']);
	});

	it('returns a new collection and all its options', () => {
		const oldType = type([text('url')]);
		const newType = type([text('url'), collection('options', [text('a'), text('b')])]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual([
			'options',
			'options.a',
			'options.b',
		]);
	});

	it('returns only the top-level name of a new fixed collection', () => {
		const oldType = type([text('url')]);
		const newType = type([
			text('url'),
			{
				displayName: 'Rules',
				name: 'rules',
				type: 'fixedCollection',
				default: {},
				options: [{ displayName: 'Values', name: 'values', values: [text('inner')] }],
			},
		]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['rules']);
	});

	it('takes the union of same-named collections', () => {
		const oldType = type([collection('options', [text('a')]), collection('options', [text('b')])]);
		const newType = type([
			collection('options', [text('a'), text('b')]),
			collection('options', [text('b'), text('c')]),
		]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['options.c']);
	});

	it('returns nothing for the same version', () => {
		const shared = type([
			text('added', { displayOptions: { show: fromVersion2 } }),
			collection('options', [text('a')]),
		]);

		expect(getNewParameterPaths(shared, 2, shared, 2)).toEqual([]);
	});
});
