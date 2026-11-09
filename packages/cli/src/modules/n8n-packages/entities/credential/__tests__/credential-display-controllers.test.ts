import type { INodeProperties } from 'n8n-workflow';

import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import {
	findDisplayControllers,
	isConfirmedControllerValue,
	keepConfirmedCredentialData,
	resolveCredentialProperties,
} from '../credential-display-controllers';
import { postgresLikeCredentialType } from './postgres-like-credential-type';

const postgresLike = postgresLikeCredentialType.properties;

describe('findDisplayControllers', () => {
	it('returns the controller of a field that carries an exported expression', () => {
		const controllers = findDisplayControllers(
			[
				{ displayName: 'Auth', name: 'authentication', type: 'boolean', default: false },
				{
					displayName: 'User',
					name: 'username',
					type: 'string',
					displayOptions: { show: { authentication: [true] } },
					default: '',
				},
			],
			['username'],
		);

		expect(controllers).toEqual(new Set(['authentication']));
	});

	it('walks up the chain: the controller of a controller travels too', () => {
		const controllers = findDisplayControllers(postgresLike, ['caCertificate']);

		expect(controllers).toEqual(new Set(['ssl', 'allowUnauthorizedCerts']));
	});

	it('also reads `hide` conditions', () => {
		const controllers = findDisplayControllers(
			[
				{ displayName: 'Mode', name: 'mode', type: 'options', options: [], default: 'a' },
				{
					displayName: 'Token',
					name: 'token',
					type: 'string',
					displayOptions: { hide: { mode: ['none'] } },
					default: '',
				},
			],
			['token'],
		);

		expect(controllers).toEqual(new Set(['mode']));
	});

	it('returns nothing when the exported field is always visible', () => {
		expect(findDisplayControllers(postgresLike, ['host'])).toEqual(new Set());
	});

	it('returns nothing for a name that is not in the type', () => {
		expect(findDisplayControllers(postgresLike, ['doesNotExist'])).toEqual(new Set());
	});

	it.each<[string, INodeProperties]>([
		['a string field', { displayName: 'C', name: 'c', type: 'string', default: '' }],
		['a number field', { displayName: 'C', name: 'c', type: 'number', default: 0 }],
		[
			'a password field of a qualifying type',
			{
				displayName: 'C',
				name: 'c',
				type: 'boolean',
				typeOptions: { password: true },
				default: false,
			},
		],
	])('excludes %s as a controller', (_label, controller) => {
		const controllers = findDisplayControllers(
			[
				controller,
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					displayOptions: { show: { c: [true] } },
					default: '',
				},
			],
			['key'],
		);

		expect(controllers).toEqual(new Set());
	});

	it('still walks through a non-qualifying controller to reach a qualifying one', () => {
		const controllers = findDisplayControllers(
			[
				{ displayName: 'Toggle', name: 'toggle', type: 'boolean', default: false },
				{
					displayName: 'Label',
					name: 'label',
					type: 'string',
					displayOptions: { show: { toggle: [true] } },
					default: '',
				},
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					displayOptions: { show: { label: ['x'] } },
					default: '',
				},
			],
			['key'],
		);

		expect(controllers).toEqual(new Set(['toggle']));
	});

	it('terminates on a cycle in displayOptions', () => {
		const controllers = findDisplayControllers(
			[
				{
					displayName: 'A',
					name: 'a',
					type: 'boolean',
					displayOptions: { show: { b: [true] } },
					default: false,
				},
				{
					displayName: 'B',
					name: 'b',
					type: 'boolean',
					displayOptions: { show: { a: [true] } },
					default: false,
				},
			],
			['a'],
		);

		expect(controllers).toEqual(new Set(['a', 'b']));
	});

	it('ignores display keys that are not field names, such as @version', () => {
		const controllers = findDisplayControllers(
			[
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					displayOptions: { show: { '@version': [1] } },
					default: '',
				},
			],
			['key'],
		);

		expect(controllers).toEqual(new Set());
	});
});

describe('isConfirmedControllerValue', () => {
	const properties: INodeProperties[] = [
		{ displayName: 'Toggle', name: 'toggle', type: 'boolean', default: false },
		{ displayName: 'Port', name: 'port', type: 'number', default: 1 },
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			options: [
				{ name: 'A', value: 'a' },
				{ name: 'B', value: 'b' },
			],
			default: 'a',
		},
		{
			displayName: 'Scopes',
			name: 'scopes',
			type: 'multiOptions',
			options: [
				{ name: 'Read', value: 'read' },
				{ name: 'Write', value: 'write' },
			],
			default: [],
		},
		{ displayName: 'Host', name: 'host', type: 'string', default: '' },
	];

	it.each([
		['toggle', true],
		['toggle', false],
		['mode', 'b'],
		['scopes', ['read', 'write']],
		['scopes', []],
	])('accepts %s = %j', (name, value) => {
		expect(isConfirmedControllerValue(properties, name, value)).toBe(true);
	});

	it.each([
		['toggle', 'false'],
		['toggle', 1],
		['port', 5432],
		['port', '5432'],
		['mode', 'not-listed'],
		['mode', ['a']],
		['scopes', ['read', 'admin']],
		['scopes', 'read'],
		['host', 'db.internal'],
		['missing', true],
	])('rejects %s = %j', (name, value) => {
		expect(isConfirmedControllerValue(properties, name, value)).toBe(false);
	});
});

describe('resolveCredentialProperties', () => {
	function typesFrom(
		definitions: Record<string, { extends?: string[]; properties: INodeProperties[] }>,
	) {
		const credentialTypes = mock<CredentialTypes>();
		credentialTypes.recognizes.mockImplementation((name) => name in definitions);
		credentialTypes.getByName.mockImplementation((name) => ({
			name,
			displayName: name,
			...definitions[name],
		}));
		return credentialTypes;
	}

	const field = (name: string, label: string): INodeProperties => ({
		displayName: label,
		name,
		type: 'string',
		default: '',
	});

	it('returns undefined for a type that this instance does not know', () => {
		expect(resolveCredentialProperties(typesFrom({}), 'unknown')).toBeUndefined();
	});

	it('lets a field of the type replace a parent field of the same name', () => {
		const properties = resolveCredentialProperties(
			typesFrom({
				parent: { properties: [field('shared', 'Parent'), field('onlyParent', 'Parent')] },
				child: { extends: ['parent'], properties: [field('shared', 'Child')] },
			}),
			'child',
		);

		expect(properties?.map(({ name, displayName }) => `${name}:${displayName}`).sort()).toEqual([
			'onlyParent:Parent',
			'shared:Child',
		]);
	});

	it('merges several parents in the order of `extends`, like the credential runtime', () => {
		const properties = resolveCredentialProperties(
			typesFrom({
				grandparent: { properties: [field('shared', 'Grandparent')] },
				first: { extends: ['grandparent'], properties: [] },
				second: { properties: [field('shared', 'Second')] },
				child: { extends: ['first', 'second'], properties: [] },
			}),
			'child',
		);

		expect(properties?.find(({ name }) => name === 'shared')?.displayName).toBe('Second');
	});

	it('keeps the own fields of a root type, even when they are marked doNotInherit', () => {
		const properties = resolveCredentialProperties(
			typesFrom({
				root: {
					properties: [
						{ ...field('jweEnabled', 'Own'), doNotInherit: true },
						field('plain', 'Own'),
					],
				},
			}),
			'root',
		);

		expect(properties?.map(({ name }) => name).sort()).toEqual(['jweEnabled', 'plain']);
	});

	it('skips a doNotInherit field of a parent, like the credential runtime', () => {
		const properties = resolveCredentialProperties(
			typesFrom({
				parent: {
					properties: [
						{ ...field('jweEnabled', 'Parent'), doNotInherit: true },
						field('plain', 'P'),
					],
				},
				child: { extends: ['parent'], properties: [] },
			}),
			'child',
		);

		expect(properties?.map(({ name }) => name)).toEqual(['plain']);
	});

	it.each([
		[
			'throws',
			() => {
				throw new Error('load failed');
			},
		],
		['returns nothing', () => undefined],
	])('treats a type as unknown when loading it %s', (_label, load) => {
		const credentialTypes = mock<CredentialTypes>();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockImplementation(load as () => never);

		expect(resolveCredentialProperties(credentialTypes, 'broken')).toBeUndefined();
	});

	it('skips a parent that this instance does not know', () => {
		const properties = resolveCredentialProperties(
			typesFrom({ child: { extends: ['missing'], properties: [field('own', 'Own')] } }),
			'child',
		);

		expect(properties?.map(({ name }) => name)).toEqual(['own']);
	});

	it('terminates on a cycle in `extends`', () => {
		const properties = resolveCredentialProperties(
			typesFrom({
				a: { extends: ['b'], properties: [field('a', 'A')] },
				b: { extends: ['a'], properties: [field('b', 'B')] },
			}),
			'a',
		);

		expect(properties?.map(({ name }) => name).sort()).toEqual(['a', 'b']);
	});
});

describe('keepConfirmedCredentialData', () => {
	const EXPRESSION = '={{ $secrets.ca }}';

	it('removes a never-exported key from inside a kept expression value', () => {
		const { data, dropped } = keepConfirmedCredentialData(
			{ nested: { token: EXPRESSION, oauthTokenData: { access_token: 'plain-token' } } },
			postgresLike,
		);

		expect(data).toEqual({ nested: { token: EXPRESSION } });
		expect(dropped).toEqual(['nested']);
	});

	it('drops a top-level never-exported key', () => {
		const { data, dropped } = keepConfirmedCredentialData(
			{ caCertificate: EXPRESSION, oauthTokenData: EXPRESSION },
			postgresLike,
		);

		expect(data).toEqual({ caCertificate: EXPRESSION });
		expect(dropped).toEqual(['oauthTokenData']);
	});

	it('drops a controller that no kept expression depends on', () => {
		const { data, dropped } = keepConfirmedCredentialData(
			{ host: EXPRESSION, ssl: 'require' },
			postgresLike,
		);

		expect(data).toEqual({ host: EXPRESSION });
		expect(dropped).toEqual(['ssl']);
	});

	it('drops a controller value that the field cannot hold', () => {
		const { data, dropped } = keepConfirmedCredentialData(
			{ caCertificate: EXPRESSION, ssl: 'hunter2', allowUnauthorizedCerts: 'false' },
			postgresLike,
		);

		expect(data).toEqual({ caCertificate: EXPRESSION });
		expect(dropped.sort()).toEqual(['allowUnauthorizedCerts', 'ssl']);
	});
});
