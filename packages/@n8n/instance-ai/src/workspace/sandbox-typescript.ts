import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Pin the experimental API. Verify its contract before upgrading.
export const SANDBOX_TYPESCRIPT_VERSION = '7.0.2';

const TSCONFIG = {
	compilerOptions: {
		strict: true,
		// The SDK types mark onTrue/onFalse as optional. They are present at runtime.
		strictNullChecks: false,
		noEmit: true,
		target: 'ES2022',
		types: ['node'],
		module: 'ES2022',
		moduleResolution: 'bundler',
		esModuleInterop: true,
		skipLibCheck: true,
	},
	include: ['src/**/*.ts', 'chunks/**/*.ts'],
};

export const TSCONFIG_JSON = JSON.stringify(TSCONFIG, null, 2);

export const WORKFLOW_DIAGNOSTICS_FILENAME = 'workflow-diagnostics.mts';

export async function loadWorkflowDiagnosticsWorker(): Promise<string> {
	return await readFile(resolve(__dirname, '../../assets', WORKFLOW_DIAGNOSTICS_FILENAME), 'utf8');
}
