import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

export default createVitestConfigWithDecorators({
	// The n8n root jest.config sets `restoreMocks: true`, and most test files silently
	// rely on it — omit this and mocks bleed between tests.
	restoreMocks: true,
});
