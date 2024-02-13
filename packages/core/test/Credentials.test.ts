import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';
import type { CredentialInformation } from 'n8n-workflow';
import { Cipher } from '@/Cipher';
import { Credentials } from '@/Credentials';
import type { InstanceSettings } from '@/InstanceSettings';

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
			const credentials = new Credentials({ id: null, name: 'testName' }, 'testType', []);

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
				[],
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

	describe('with nodeType set', () => {
		test('should be able to set and read key data without initial data set', () => {
			const nodeAccess = [
				{
					nodeType: 'base.noOp',
					user: 'userName',
					date: new Date(),
				},
			];

			const credentials = new Credentials({ id: null, name: 'testName' }, 'testType', nodeAccess);

			const key = 'key1';
			const nodeType = 'base.noOp';
			const newData = 1234;

			setDataKey(credentials, key, newData);

			// Should be able to read with nodeType which has access
			expect(credentials.getData(nodeType)[key]).toEqual(newData);

			// Should not be able to read with nodeType which does NOT have access
			// expect(credentials.getData('base.otherNode')[key]).toThrowError(Error);
			try {
				credentials.getData('base.otherNode');
				expect(true).toBe(false);
			} catch (e) {
				expect(e.message).toBe('Node does not have access to credential');
			}

			// Get the data which will be saved in database
			const dbData = credentials.getDataToSave();
			expect(dbData.name).toEqual('testName');
			expect(dbData.type).toEqual('testType');
			expect(dbData.nodesAccess).toEqual(nodeAccess);
			// Compare only the first 6 characters as the rest seems to change with each execution
			expect(dbData.data!.slice(0, 6)).toEqual(
				'U2FsdGVkX1+wpQWkj+YTzaPSNTFATjnlmFKIsUTZdhk='.slice(0, 6),
			);
		});
	});
});
