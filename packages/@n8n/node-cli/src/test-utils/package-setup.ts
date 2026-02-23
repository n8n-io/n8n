import fs from 'node:fs/promises';

import type { N8nPackageJson } from '../utils/package';

export interface PackageSetupOptions {
	packageJson?: Partial<N8nPackageJson>;
	eslintConfig?: string | boolean;
}

const DEFAULT_PACKAGE_CONFIG: N8nPackageJson = {
	name: 'test-node',
	version: '1.0.0',
	n8n: {
		nodes: ['dist/nodes/TestNode.node.js'],
		strict: true,
	},
};

const DEFAULT_ESLINT_CONFIG =
	"import { config } from '@n8n/node-cli/eslint';\n\nexport default config;\n";

export async function setupTestPackage(
	tmpdir: string,
	options: PackageSetupOptions = {},
): Promise<void> {
	const packageConfig = {
		...DEFAULT_PACKAGE_CONFIG,
		...options.packageJson,
		n8n: {
			...DEFAULT_PACKAGE_CONFIG.n8n,
			...options.packageJson?.n8n,
		},
	};
	await fs.writeFile(`${tmpdir}/package.json`, JSON.stringify(packageConfig, null, 2));

	if (options.eslintConfig === true) {
		await fs.writeFile(`${tmpdir}/eslint.config.mjs`, DEFAULT_ESLINT_CONFIG);
	} else if (typeof options.eslintConfig === 'string') {
		await fs.writeFile(`${tmpdir}/eslint.config.mjs`, options.eslintConfig);
	}
}
