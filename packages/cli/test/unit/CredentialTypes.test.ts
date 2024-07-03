import { CredentialTypes } from '@/CredentialTypes';
import { Container } from 'typedi';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { mockInstance } from '../shared/mocking';

describe('CredentialTypes', () => {
	const mockNodesAndCredentials = mockInstance(LoadNodesAndCredentials, {
		loadedCredentials: {
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
	});

	const credentialTypes = Container.get(CredentialTypes);

	test('Should throw error when calling invalid credential name', () => {
		expect(() => credentialTypes.getByName('fakeThirdCredential')).toThrowError();
	});

	test('Should return correct credential type for valid name', () => {
		const mockedCredentialTypes = mockNodesAndCredentials.loadedCredentials;
		expect(credentialTypes.getByName('fakeFirstCredential')).toStrictEqual(
			mockedCredentialTypes.fakeFirstCredential.type,
		);
	});
});
