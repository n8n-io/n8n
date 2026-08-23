import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	globalSetup: ['./scripts/vitest-global-setup.ts'],
});
