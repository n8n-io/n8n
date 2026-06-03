import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	// The n8n root jest.config sets `restoreMocks: true`, and test files silently rely on
	// it — omit this and mocks bleed between tests.
	restoreMocks: true,
});
