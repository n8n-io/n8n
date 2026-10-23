import './setup-test-folder';

import { createTestDatabaseGlobalSetup } from 'n8n-containers/test-db-global-setup';

// Run migrations after the suite registers this package's entity.
export const { setup, teardown } = createTestDatabaseGlobalSetup();
