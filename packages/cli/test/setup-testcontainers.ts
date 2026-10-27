import { createTestDatabaseGlobalSetup } from 'n8n-containers/test-db-global-setup';

export const { setup, teardown } = createTestDatabaseGlobalSetup({
	initializeTemplateDb: async (templateName) => {
		// Resolve config after the global setup has populated the DB environment.
		const { testDb } = await import('@n8n/backend-test-utils');
		await testDb.initTemplateDb(templateName);
	},
});
