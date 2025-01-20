import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { CredentialInformation } from 'n8n-workflow';

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
});
