import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	setupFiles: ['./test/extend-expect.ts'],
});
