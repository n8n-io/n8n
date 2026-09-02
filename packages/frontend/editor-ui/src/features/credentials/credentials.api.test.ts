import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { oAuth1CredentialAuthorize, oAuth2CredentialAuthorize } from './credentials.api';
import type { ICredentialsResponse } from './credentials.types';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const makeRestApiRequestMock = vi.mocked(makeRestApiRequest);

const context: IRestApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

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
