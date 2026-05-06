import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	include: ['**/*.e2e.test.ts'],
});
