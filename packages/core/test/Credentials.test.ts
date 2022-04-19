import { Credentials } from '../src';

describe('Credentials', () => {
	describe('without nodeType set', () => {
		test('should be able to set and read key data without initial data set', () => {
			const credentials = new Credentials({ id: null, name: 'testName' }, 'testType', []);

			const key = 'key1';
			const password = 'password';
			// const nodeType = 'base.noOp';
			const newData = 1234;

			credentials.setDataKey(key, newData, password);

			expect(credentials.getDataKey(key, password)).toEqual(newData);
		});

		test('should be able to set and read key data with initial data set', () => {
			const key = 'key2';
			const password = 'password';

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
			credentials.setDataKey(key, newData, password);
			expect(credentials.getDataKey(key, password)).toEqual(newData);

			// Read the data which got provided encrypted on init
			expect(credentials.getDataKey('key1', password)).toEqual(initialData);
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
			const password = 'password';
			const nodeType = 'base.noOp';
			const newData = 1234;

			credentials.setDataKey(key, newData, password);

			// Should be able to read with nodeType which has access
			expect(credentials.getDataKey(key, password, nodeType)).toEqual(newData);

			// Should not be able to read with nodeType which does NOT have access
			// expect(credentials.getDataKey(key, password, 'base.otherNode')).toThrowError(Error);
			try {
				credentials.getDataKey(key, password, 'base.otherNode');
				expect(true).toBe(false);
			} catch (e) {
				expect(e.message).toBe(
					'The node of type "base.otherNode" does not have access to credentials "testName" of type "testType".',
				);
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
