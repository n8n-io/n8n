import type { ICredentialTypes, INodesAndCredentials } from 'n8n-workflow';
import { CredentialTypes } from '@/CredentialTypes';
import { Container } from 'typedi';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

describe('CredentialTypes', () => {
	const mockNodesAndCredentials: INodesAndCredentials = {
		loaded: {
			nodes: {},
			credentials: {
				fakeFirstCredential: {
					type: {
						name: 'fakeFirstCredential',
						displayName: 'Fake First Credential',
						properties: [],
					},
					sourcePath: '',
				},
				fakeSecondCredential: {
					type: {
						name: 'fakeSecondCredential',
						displayName: 'Fake Second Credential',
						properties: [],
					},
					sourcePath: '',
				},
			},
		},
		known: { nodes: {}, credentials: {} },
		credentialTypes: {} as ICredentialTypes,
	};

	Container.set(LoadNodesAndCredentials, mockNodesAndCredentials);

	const credentialTypes = Container.get(CredentialTypes);

	test('Should throw error when calling invalid credential name', () => {
		expect(() => credentialTypes.getByName('fakeThirdCredential')).toThrowError();
	});

	test('Should return correct credential type for valid name', () => {
		const mockedCredentialTypes = mockNodesAndCredentials.loaded.credentials;
		expect(credentialTypes.getByName('fakeFirstCredential')).toStrictEqual(
			mockedCredentialTypes.fakeFirstCredential.type,
		);
	});
});
