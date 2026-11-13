import { createVitestConfig } from '@n8n/vitest-config/node';

// Pin n8n-workflow to its CJS build, so this package and the shim share one
// `Expression` engine and one set of classes.
export default createVitestConfig(
	{ setupFiles: ['./src/__tests__/setup.ts'] },
	{ pinCjs: ['n8n-workflow'] },
);
