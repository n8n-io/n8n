import './setup-test-folder';

import { createTestDatabaseGlobalSetup } from 'n8n-containers/test-db-global-setup';

// Starts the Postgres and Redis containers, and migrates a template database once. Each test
// file clones the template in `testDb.init()` instead of running all migrations again.
export const { setup, teardown } = createTestDatabaseGlobalSetup({
	initializeTemplateDb: async (templateName) => {
		// Resolve config after the global setup has populated the DB environment.
		const { testDb } = await import('@n8n/backend-test-utils');
		await testDb.initTemplateDb(templateName);
	},
});
