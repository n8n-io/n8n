import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
	setupFiles: ['./src/__tests__/setup-vm-evaluator.ts'],
});
