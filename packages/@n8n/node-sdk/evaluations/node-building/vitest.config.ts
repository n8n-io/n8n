import { createVitestConfig } from '@n8n/vitest-config/node';

// The eval tests end in `.eval.ts`, so the package's own `vitest run` skips them:
// they need the core and node-cli builds and the fixed mock port.
export default createVitestConfig({
	root: __dirname,
	include: ['__tests__/**/*.eval.ts'],
	testTimeout: 240_000,
	hookTimeout: 240_000,
});
