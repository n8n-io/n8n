import type { ICredentialTypeData, ICredentialTypes } from 'n8n-workflow';
import { CredentialTypes } from '@/CredentialTypes';

describe('ActiveExecutions', () => {
	let credentialTypes: ICredentialTypes;

	beforeEach(() => {
		credentialTypes = CredentialTypes();
	});

	test('Should start with empty credential list', () => {
		expect(credentialTypes.getAll()).toEqual([]);
	});

	test('Should initialize credential types', () => {
		credentialTypes.init(mockCredentialTypes());
		expect(credentialTypes.getAll()).toHaveLength(2);
	});

	test('Should return all credential types', () => {
		credentialTypes.init(mockCredentialTypes());
		const mockedCredentialTypes = mockCredentialTypes();
		expect(credentialTypes.getAll()).toStrictEqual([
			mockedCredentialTypes.fakeFirstCredential.type,
			mockedCredentialTypes.fakeSecondCredential.type,
		]);
	});

	test('Should throw error when calling invalid credential name', () => {
		credentialTypes.init(mockCredentialTypes());
		expect(() => credentialTypes.getByName('fakeThirdCredential')).toThrowError();
	});

	test('Should return correct credential type for valid name', () => {
		credentialTypes.init(mockCredentialTypes());
		const mockedCredentialTypes = mockCredentialTypes();
		expect(credentialTypes.getByName('fakeFirstCredential')).toStrictEqual(
			mockedCredentialTypes.fakeFirstCredential.type,
		);
	});
});

function mockCredentialTypes(): ICredentialTypeData {
	return {
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
	};
}
