import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	coverage: {
		exclude: ['dist/**', 'bundle/**', '**/*.test.ts', '**/*.config.ts'],
	},
});
