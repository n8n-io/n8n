import type { ICredentialTypes, INodesAndCredentials } from 'n8n-workflow';
import { CredentialTypes } from '@/CredentialTypes';

describe('ActiveExecutions', () => {
	let credentialTypes: ICredentialTypes;

	beforeEach(() => {
		credentialTypes = CredentialTypes(mockNodesAndCredentials());
	});

	test('Should initialize credential types', () => {
		expect(credentialTypes.getAll()).toHaveLength(2);
	});

	test('Should return all credential types', () => {
		const mockedCredentialTypes = mockNodesAndCredentials().loaded.credentials;
		expect(credentialTypes.getAll()).toStrictEqual([
			mockedCredentialTypes.fakeFirstCredential.type,
			mockedCredentialTypes.fakeSecondCredential.type,
		]);
	});

	test('Should throw error when calling invalid credential name', () => {
		expect(() => credentialTypes.getByName('fakeThirdCredential')).toThrowError();
	});

	test('Should return correct credential type for valid name', () => {
		const mockedCredentialTypes = mockNodesAndCredentials().loaded.credentials;
		expect(credentialTypes.getByName('fakeFirstCredential')).toStrictEqual(
			mockedCredentialTypes.fakeFirstCredential.type,
		);
	});
});

const mockNodesAndCredentials = (): INodesAndCredentials => ({
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
});
