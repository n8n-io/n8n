import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	include: ['**/*.integration.test.ts'],
});
