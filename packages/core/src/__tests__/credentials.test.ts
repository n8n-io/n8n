import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { CredentialInformation } from 'n8n-workflow';
import { AssertionError } from 'node:assert';

import { CREDENTIAL_ERRORS } from '@/constants';
import { CipherAes256CBC } from '@/encryption/aes-256-cbc';
import { CipherAes256GCM } from '@/encryption/aes-256-gcm';
import { Cipher } from '@/encryption/cipher';
import { EncryptionKeyProxy } from '@/encryption/encryption-key-proxy';
import type { InstanceSettings } from '@/instance-settings';

import { Credentials } from '../credentials';

describe('Credentials', () => {
	const nodeCredentials = { id: '123', name: 'Test Credential' };
	const credentialType = 'testApi';

	const cipher = new Cipher(
		mock<InstanceSettings>({ encryptionKey: 'password' }),
		new CipherAes256GCM(),
		new CipherAes256CBC(),
		new EncryptionKeyProxy(),
	);
	Container.set(Cipher, cipher);

	const setDataKey = async (credentials: Credentials, key: string, data: CredentialInformation) => {
		let fullData;
		try {
			fullData = await credentials.getData();
		} catch (e) {
			fullData = {};
		}
		fullData[key] = data;
		return await credentials.setData(fullData);
	};

	describe('without nodeType set', () => {
		test('should be able to set and read key data without initial data set', async () => {
			const credentials = new Credentials(nodeCredentials, credentialType);

			const key = 'key1';
			const newData = 1234;

			await setDataKey(credentials, key, newData);

			expect((await credentials.getData())[key]).toEqual(newData);
		});

		test('should be able to set and read key data with initial data set', async () => {
			const key = 'key2';

			// Saved under "key1"
			const initialData = 4321;
			const initialDataEncoded = 'U2FsdGVkX1+0baznXt+Ag/ub8A2kHLyoLxn/rR9h4XQ=';

			const credentials = new Credentials(nodeCredentials, credentialType, initialDataEncoded);

			const newData = 1234;

			// Set and read new data
			await setDataKey(credentials, key, newData);
			expect((await credentials.getData())[key]).toEqual(newData);

			// Read the data which got provided encrypted on init
			expect((await credentials.getData()).key1).toEqual(initialData);
		});
	});

	describe('getData', () => {
		test('should throw an error when data is missing', async () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.data = undefined;

			await expect(credentials.getData()).rejects.toThrow(CREDENTIAL_ERRORS.NO_DATA);
		});

		test('should throw an error when decryption fails', async () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.data = '{"key": "already-decrypted-credentials-data" }';

			await expect(credentials.getData()).rejects.toThrow(CREDENTIAL_ERRORS.DECRYPTION_FAILED);

			try {
				await credentials.getData();
			} catch (error) {
				expect(error.constructor.name).toBe('CredentialDataError');
				expect(error.extra).toEqual({ ...nodeCredentials, type: credentialType });
				expect((error.cause.code as string).startsWith('ERR_OSSL_')).toBe(true);
			}
		});

		test('should throw an error when JSON parsing fails', async () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			credentials.data = cipher.encrypt('invalid-json-string');

			await expect(credentials.getData()).rejects.toThrow(CREDENTIAL_ERRORS.INVALID_JSON);

			try {
				await credentials.getData();
			} catch (error) {
				expect(error.constructor.name).toBe('CredentialDataError');
				expect(error.extra).toEqual({ ...nodeCredentials, type: credentialType });
				expect(error.cause).toBeInstanceOf(SyntaxError);
				expect(error.cause.message).toMatch('Unexpected token ');
			}
		});

		test('should successfully decrypt and parse valid JSON credentials', async () => {
			const credentials = new Credentials(nodeCredentials, credentialType);
			await credentials.setData({ username: 'testuser', password: 'testpass' });

			const decryptedData = await credentials.getData();
			expect(decryptedData.username).toBe('testuser');
			expect(decryptedData.password).toBe('testpass');
		});
	});

	describe('setData', () => {
		test.each<{}>([[123], [null], [undefined]])(
			'should throw an AssertionError when data is %s',
			async (data) => {
				const credentials = new Credentials<{}>(nodeCredentials, credentialType);

				await expect(credentials.setData(data)).rejects.toThrow(AssertionError);
			},
		);
	});

	describe('updateData', () => {
		const nodeCredentials = { id: '123', name: 'Test Credential' };
		const credentialType = 'testApi';

		test('should update existing data', async () => {
			const credentials = new Credentials(
				nodeCredentials,
				credentialType,
				cipher.encrypt({
					username: 'olduser',
					password: 'oldpass',
					apiKey: 'oldkey',
				}),
			);

			await credentials.updateData({ username: 'newuser', password: 'newpass' });

			expect(await credentials.getData()).toEqual({
				username: 'newuser',
				password: 'newpass',
				apiKey: 'oldkey',
			});
		});

		test('should delete specified keys', async () => {
			const credentials = new Credentials(
				nodeCredentials,
				credentialType,
				cipher.encrypt({
					username: 'testuser',
					password: 'testpass',
					apiKey: 'testkey',
				}),
			);

			await credentials.updateData({}, ['username', 'apiKey']);

			expect(await credentials.getData()).toEqual({
				password: 'testpass',
			});
		});

		test('should update and delete keys in same operation', async () => {
			const credentials = new Credentials(
				nodeCredentials,
				credentialType,
				cipher.encrypt({
					username: 'olduser',
					password: 'oldpass',
					apiKey: 'oldkey',
				}),
			);

			await credentials.updateData({ username: 'newuser' }, ['apiKey']);

			expect(await credentials.getData()).toEqual({
				username: 'newuser',
				password: 'oldpass',
			});
		});

		test('should throw an error if no data was previously set', async () => {
			const credentials = new Credentials(nodeCredentials, credentialType);

			await expect(credentials.updateData({ username: 'newuser' })).rejects.toThrow(
				CREDENTIAL_ERRORS.NO_DATA,
			);
		});
	});
});
