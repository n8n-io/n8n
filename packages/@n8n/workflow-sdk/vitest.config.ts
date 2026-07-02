import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	// Restore mocks between tests; the test files rely on this.
	restoreMocks: true,
	globalSetup: ['./scripts/vitest-global-setup.ts'],
});
