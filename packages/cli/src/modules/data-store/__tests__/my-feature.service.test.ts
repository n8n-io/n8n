import { testDb, testModules } from '@n8n/backend-test-utils';

import { DataStoreService } from '../data-store.service';

beforeAll(async () => {
	await testModules.loadModules(['data-store']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataStoreUnit']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('start', () => {
	it('should do something', () => {
		expect(true).toBeTruthy();
	});
});
