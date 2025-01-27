import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { CredentialInformation } from 'n8n-workflow';

import { CREDENTIAL_ERRORS } from '@/constants';
import { Cipher } from '@/encryption/cipher';
import type { InstanceSettings } from '@/instance-settings';

import { Credentials } from '../credentials';

describe('Credentials', () => {
	const cipher = new Cipher(mock<InstanceSettings>({ encryptionKey: 'password' }));
	Container.set(Cipher, cipher);

	const setDataKey = (credentials: Credentials, key: string, data: CredentialInformation) => {
		let fullData;
		try {
			fullData = credentials.getData();
		} catch (e) {
			fullData = {};
		}
		fullData[key] = data;
		return credentials.setData(fullData);
	};

	describe('without nodeType set', () => {
		test('should be able to set and read key data without initial data set', () => {
			const credentials = new Credentials({ id: null, name: 'testName' }, 'testType');

			const key = 'key1';
			const newData = 1234;

			setDataKey(credentials, key, newData);

			expect(credentials.getData()[key]).toEqual(newData);
		});

		test('should be able to set and read key data with initial data set', () => {
			const key = 'key2';

			// Saved under "key1"
			const initialData = 4321;
			const initialDataEncoded = 'U2FsdGVkX1+0baznXt+Ag/ub8A2kHLyoLxn/rR9h4XQ=';

			const credentials = new Credentials(
				{ id: null, name: 'testName' },
				'testType',
				initialDataEncoded,
			);

			const newData = 1234;

			// Set and read new data
			setDataKey(credentials, key, newData);
			expect(credentials.getData()[key]).toEqual(newData);

			// Read the data which got provided encrypted on init
			expect(credentials.getData().key1).toEqual(initialData);
		});
	});

	describe('getData', () => {
		const nodeCredentials = { id: '123', name: 'testName' };
		const credentialType = 'testApi';

		test('should throw an error when data is missing', () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.data = undefined;

			expect(() => credentials.getData()).toThrow(CREDENTIAL_ERRORS.NO_DATA);
		});

		test('should throw an error when decryption fails', () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.data = 'invalid-credentials-data';

			expect(() => credentials.getData()).toThrow(CREDENTIAL_ERRORS.DECRYPTION_FAILED);
		});

		test('should throw an error when JSON parsing fails', () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.data = cipher.encrypt('invalid-json-string');

			expect(() => credentials.getData()).toThrow(CREDENTIAL_ERRORS.INVALID_JSON);
		});
		test('should successfully decrypt and parse valid JSON credentials', () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.setData({ username: 'testuser', password: 'testpass' });

			const decryptedData = credentials.getData();
			expect(decryptedData.username).toBe('testuser');
			expect(decryptedData.password).toBe('testpass');
		});
	});
});
