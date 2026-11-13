import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	getApiUrl,
	getFields,
	getPortals,
	getScripts,
	layoutsApiRequest,
	logout,
	toPathValue,
} from '../GenericFunctions';

describe('FileMaker > GenericFunctions', () => {
	const request = jest.fn();
	let layout = 'Contacts';
	let typeVersion = 1.1;
	let credentials = {
		host: 'fm.example.com',
		db: 'CRM',
		login: 'admin',
		password: 'fake-password',
	};

	const context = {
		getCredentials: async () => credentials,
		getCurrentNodeParameter: () => layout,
		getNode: () => ({ name: 'FileMaker', typeVersion }),
		helpers: { request },
	} as unknown as ILoadOptionsFunctions;

	const requestedUrls = () => request.mock.calls.map(([options]) => String(options.uri));

	beforeEach(() => {
		request.mockReset();
		layout = 'Contacts';
		typeVersion = 1.1;
		credentials = { ...credentials, host: 'fm.example.com', db: 'CRM' };
		request.mockImplementation(async (options: { method: string }) =>
			options.method === 'POST'
				? { response: { token: 'a1b2c3d4e5f6' } }
				: {
						response: {
							layouts: [{ name: 'Contacts' }],
							scripts: [{ name: 'SendEmail' }],
							fieldMetaData: [],
							portalMetaData: {},
						},
					},
		);
	});

	it('should request the layouts', async () => {
		await layoutsApiRequest.call(context);

		expect(requestedUrls()).toEqual([
			'https://fm.example.com/fmi/data/v1/databases/CRM/sessions',
			'https://fm.example.com/fmi/data/v1/databases/CRM/layouts',
		]);
	});

	it('should request the fields and portals of a layout', async () => {
		await getFields.call(context);
		await getPortals.call(context);

		expect(requestedUrls()).toEqual([
			'https://fm.example.com/fmi/data/v1/databases/CRM/sessions',
			'https://fm.example.com/fmi/data/v1/databases/CRM/layouts/Contacts',
			'https://fm.example.com/fmi/data/v1/databases/CRM/sessions',
			'https://fm.example.com/fmi/data/v1/databases/CRM/layouts/Contacts',
		]);
	});

	it('should request the scripts', async () => {
		await getScripts.call(context);

		expect(requestedUrls()).toEqual([
			'https://fm.example.com/fmi/data/v1/databases/CRM/sessions',
			'https://fm.example.com/fmi/data/v1/databases/CRM/scripts',
		]);
	});

	it('should close the session', async () => {
		await logout.call(context, 'a1b2c3d4e5f6');

		expect(requestedUrls()).toEqual([
			'https://fm.example.com/fmi/data/v1/databases/CRM/sessions/a1b2c3d4e5f6',
		]);
	});

	it('should encode a layout that contains a slash', async () => {
		layout = 'Folder/Contacts';
		await getFields.call(context);

		expect(requestedUrls()[1]).toBe(
			'https://fm.example.com/fmi/data/v1/databases/CRM/layouts/Folder%2FContacts',
		);
	});

	it('should reject a layout with a dot segment', async () => {
		layout = 'Contacts/../scripts';

		await expect(getFields.call(context)).rejects.toThrow('Invalid identifier');
	});

	it('should encode a layout as entered in version 1.1', async () => {
		layout = 'My%20Layout';
		await getFields.call(context);

		expect(requestedUrls()[1]).toBe(
			'https://fm.example.com/fmi/data/v1/databases/CRM/layouts/My%2520Layout',
		);
	});

	it.each(['getFields', 'getPortals'] as const)(
		'should decode a layout in version 1 for %s',
		async (method) => {
			typeVersion = 1;
			layout = 'My%20Layout';
			await { getFields, getPortals }[method].call(context);

			expect(requestedUrls()[1]).toBe(
				'https://fm.example.com/fmi/data/v1/databases/CRM/layouts/My%20Layout',
			);
		},
	);

	it('should decode path values only before version 1.1', () => {
		expect(toPathValue(1, 'a%2Fb')).toBe('a/b');
		expect(toPathValue(1.1, 'a%2Fb')).toBe('a%2Fb');
	});

	it('should use a host with a port and an IP address host', async () => {
		credentials.host = '192.168.1.10:8443';
		await logout.call(context, 'a1b2c3d4e5f6');
		credentials.host = '192.168.1.10';
		await logout.call(context, 'a1b2c3d4e5f6');

		expect(requestedUrls()).toEqual([
			'https://192.168.1.10:8443/fmi/data/v1/databases/CRM/sessions/a1b2c3d4e5f6',
			'https://192.168.1.10/fmi/data/v1/databases/CRM/sessions/a1b2c3d4e5f6',
		]);
	});

	it.each([
		'fm.example.com',
		'fm.example.com:8443',
		'192.168.1.10',
		'192.168.1.10:8443',
		'[2001:db8::1]',
		'[2001:db8::1]:8443',
		'fm.example.com/prefix',
		'fm.example.com:8443/a/b',
		'fm.example.com/',
		'fm.example.com/prefix/',
	])('should build the same API URL as before for host %s', (host) => {
		expect(String(getApiUrl(host))).toBe(`https://${host}/fmi/data/v1`);
	});

	it('should use a host with a path prefix', async () => {
		credentials.host = 'fm.example.com:8443/a/b';
		await logout.call(context, 'a1b2c3d4e5f6');

		expect(requestedUrls()).toEqual([
			'https://fm.example.com:8443/a/b/fmi/data/v1/databases/CRM/sessions/a1b2c3d4e5f6',
		]);
	});

	it.each([
		'user@fm.example.com',
		'user@fm.example.com/prefix',
		'fm.example.com?x=1',
		'fm.example.com/prefix?x=1',
		'fm.example.com#x',
		'fm.example.com/prefix#x',
	])('should reject host %s', (host) => {
		expect(() => getApiUrl(host)).toThrow();
	});
});
