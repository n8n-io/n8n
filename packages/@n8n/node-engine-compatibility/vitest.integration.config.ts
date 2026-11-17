import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig({
	include: ['**/*.integration.test.ts'],
	setupFiles: ['./src/__tests__/setup-test-folder.ts', './src/__tests__/setup-vm-evaluator.ts'],
	sequence: { setupFiles: 'list' },
	// must exceed the harness's 10s outcome deadline
	testTimeout: 30_000,
});
