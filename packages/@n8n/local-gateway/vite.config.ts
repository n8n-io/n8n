import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	// The n8n root jest.config sets `restoreMocks: true`, and the test files rely on it.
	restoreMocks: true,
});
