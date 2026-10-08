import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import {
	oAuth1CredentialAuthorize,
	oAuth2CredentialAuthorize,
	searchCredentials,
	getCredentialOptions,
	type CredentialOptionsDestination,
} from './credentials.api';
import type { ICredentialsResponse } from './credentials.types';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const makeRestApiRequestMock = vi.mocked(makeRestApiRequest);

const context: IRestApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('credentials.api resource locator', () => {
	it.each<{ destination: CredentialOptionsDestination; path: string }>([
		{
			destination: { kind: 'project', projectId: 'project-id' },
			path: '/credentials/options/projects/project-id',
		},
		{ destination: { kind: 'instance' }, path: '/credentials/options/instance' },
		{
			destination: { kind: 'stored', credentialId: 'credential-id' },
			path: '/credentials/credential-id/options',
		},
	])('sends the draft in a POST body to $path', async ({ destination, path }) => {
		const data = {
			type: 'googleVertexAiApi',
			propertyName: 'projectId',
			data: { email: 'service@example.com', privateKey: 'draft-key' },
			paginationToken: 'next-page',
		};
		await getCredentialOptions(context, destination, data);
		expect(makeRestApiRequestMock).toHaveBeenCalledWith(context, 'POST', path, data);
	});
});

// A credential as returned by the list/edit endpoints, carrying the large fields
// (homeProject, scopes, sharedWithProjects) that previously bloated the auth GET URL.
const credential = {
	id: 'cred-1',
	name: 'My OAuth credential',
	type: 'oAuth2Api',
	homeProject: {
		id: 'project-1',
		name: 'Big team project',
		type: 'team',
		scopes: Array.from({ length: 120 }, (_, i) => `scope:${i}`),
	},
	scopes: Array.from({ length: 120 }, (_, i) => `scope:${i}`),
	sharedWithProjects: [{ id: 'project-2', name: 'Another project' }],
	data: { clientId: 'abc', clientSecret: 'secret' },
} as unknown as ICredentialsResponse;

describe('credentials.api OAuth authorization', () => {
	beforeEach(() => {
		makeRestApiRequestMock.mockReset();
		makeRestApiRequestMock.mockResolvedValue('https://example.com/auth');
	});

	it('oAuth2CredentialAuthorize sends only the credential id', async () => {
		await oAuth2CredentialAuthorize(context, credential);

		expect(makeRestApiRequestMock).toHaveBeenCalledWith(context, 'GET', '/oauth2-credential/auth', {
			id: 'cred-1',
		});
	});

	it('oAuth1CredentialAuthorize sends only the credential id', async () => {
		await oAuth1CredentialAuthorize(context, credential);

		expect(makeRestApiRequestMock).toHaveBeenCalledWith(context, 'GET', '/oauth1-credential/auth', {
			id: 'cred-1',
		});
	});
});

describe('credentials.api searchCredentials', () => {
	beforeEach(() => {
		makeRestApiRequestMock.mockReset();
		makeRestApiRequestMock.mockResolvedValue([]);
	});

	it('sends the name filter, pagination, and includeGlobal', async () => {
		await searchCredentials(context, { name: 'slack', skip: 20, take: 21 });

		expect(makeRestApiRequestMock).toHaveBeenCalledWith(context, 'GET', '/credentials', {
			filter: { name: 'slack' },
			skip: 20,
			take: 21,
			includeGlobal: true,
		});
	});

	it('omits the filter when the name is empty', async () => {
		await searchCredentials(context, { name: '', skip: 0, take: 21 });

		expect(makeRestApiRequestMock).toHaveBeenCalledWith(context, 'GET', '/credentials', {
			skip: 0,
			take: 21,
			includeGlobal: true,
		});
	});
});
