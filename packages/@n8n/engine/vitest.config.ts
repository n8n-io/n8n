import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
});
