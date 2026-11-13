import { existsSync } from 'node:fs';
import path from 'node:path';

import type { GenerateConfig } from './generate';
import type { SpecOptions } from './types';

const PACKAGE_DIR = 'packages/@n8n/n8n-node-codegen';
const SPEC_DIR = 'packages/cli/src/public-api/v1';
const NODE_DIR = 'packages/nodes-base/nodes/N8n/v2';

export const N8N_SPEC_OPTIONS: SpecOptions = {
	ignoredHeaderParameters: ['Idempotency-Key'],
	cursorParameter: 'cursor',
	limitParameter: 'limit',
};

export function findRepoRoot(startDir: string): string {
	let dir = startDir;
	while (!existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
		const parent = path.dirname(dir);
		if (parent === dir) throw new Error(`Cannot find the repository root from ${startDir}`);
		dir = parent;
	}
	return dir;
}

export function n8nNodeConfig(repoRoot: string): GenerateConfig {
	return {
		envelopeFile: path.join(repoRoot, SPEC_DIR, 'openapi.yml'),
		routesFile: path.join(repoRoot, PACKAGE_DIR, 'dist/routes.yml'),
		overridesFile: path.join(repoRoot, NODE_DIR, 'overrides.ts'),
		spec: N8N_SPEC_OPTIONS,
	};
}
