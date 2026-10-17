// Produces a self-contained npm tarball of n8n-test for use OUTSIDE the monorepo,
// running against released npm n8n packages. See .agents/specs/n8n-test-poc-v2.md.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const pkgDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nodesTestingDir = path.resolve(pkgDir, '../core/nodes-testing');
const outDir = path.join(pkgDir, 'bundle-dist');

// Resolved from the consumer's node_modules. The @n8n helpers are runtime deps of
// n8n-core, so npm dedupes them to a single instance — one DI container.
const externals = [
	'n8n-core',
	'n8n-workflow',
	'n8n-nodes-base',
	'nock',
	'vitest',
	'reflect-metadata',
	'@n8n/di',
	'@n8n/decorators',
];

// Pinned to current npm releases; bump deliberately, the engine API is the risk surface.
// The @n8n helper pins MUST match what the released n8n-core depends on, or npm installs
// a second copy and the DI container splits (`npm view n8n-core@<v> dependencies`).
// nodes-base must be the release-train pairing for this core/workflow (check
// `npm view n8n@<train> dependencies`) or it nests its own second n8n-workflow copy.
const runtimeVersions = {
	'n8n-core': '2.16.1',
	'n8n-workflow': '2.16.0',
	'n8n-nodes-base': '2.16.0',
	'@n8n/di': '0.10.0',
	'@n8n/decorators': '1.16.0',
};

const nodesTestingPlugin = {
	name: 'nodes-testing-alias-and-dist-rewrite',
	setup(builder) {
		// '@nodes-testing/*' vendors the source from packages/core/nodes-testing into the bundle.
		builder.onResolve({ filter: /^@nodes-testing\// }, (args) => ({
			path: `${path.join(nodesTestingDir, args.path.replace('@nodes-testing/', ''))}.ts`,
		}));
		// Those sources import '../dist/*' relative to core; outside the monorepo that is the
		// published package's dist — rewrite to deep requires (n8n-core ships no exports map).
		builder.onResolve({ filter: /^\.\.\/dist\// }, (args) => {
			if (!args.importer.startsWith(nodesTestingDir)) return null;
			return { path: args.path.replace(/^\.\.\/dist\//, 'n8n-core/dist/'), external: true };
		});
	},
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
	entryPoints: [path.join(pkgDir, 'src/index.ts')],
	bundle: true,
	platform: 'node',
	target: 'node22',
	format: 'cjs',
	outfile: path.join(outDir, 'index.js'),
	external: externals,
	plugins: [nodesTestingPlugin],
	tsconfig: path.join(pkgDir, 'tsconfig.json'),
	logLevel: 'info',
});

writeFileSync(
	path.join(outDir, 'package.json'),
	`${JSON.stringify(
		{
			name: 'n8n-test',
			version: '0.2.0',
			description: 'PoC: test n8n workflows like code (bundled build)',
			main: 'index.js',
			types: 'index.d.ts',
			files: ['index.js', 'index.d.ts'],
			dependencies: {
				'@n8n/decorators': runtimeVersions['@n8n/decorators'],
				'@n8n/di': runtimeVersions['@n8n/di'],
				'n8n-core': runtimeVersions['n8n-core'],
				'n8n-nodes-base': runtimeVersions['n8n-nodes-base'],
				'n8n-workflow': runtimeVersions['n8n-workflow'],
				'reflect-metadata': '^0.2.2',
			},
			peerDependencies: { vitest: '>=4', nock: '>=14' },
			license: 'LicenseRef-n8n-sustainable-use',
		},
		null,
		2,
	)}\n`,
);

// Hand-written types: `workflowJson` is deliberately `unknown` so plain JSON imports
// need no casting in consumer test files.
writeFileSync(
	path.join(outDir, 'index.d.ts'),
	`export interface MockedNodeHandle {
	/** The first item's json the mocked node received; undefined until the workflow ran. */
	input(): Record<string, unknown> | undefined;
}

/**
 * Executes a workflow through the real n8n engine. \`input\` becomes the trigger node's
 * item; resolves to the last executed node's first item's json; node errors reject.
 */
export declare function runWorkflow(
	workflowJson: unknown,
	input?: Record<string, unknown>,
): Promise<Record<string, unknown>>;

/**
 * Replaces the named node's execution with a canned output for every subsequent
 * runWorkflow of this workflow object, until clearNodeMocks() runs. Multiple nodes may
 * be mocked; last mock per node name wins.
 */
export declare function mockNode(
	workflowJson: unknown,
	nodeName: string,
	output: Record<string, unknown>,
): MockedNodeHandle;

/** Forget every registered mock — call between tests so mocks never leak. */
export declare function clearNodeMocks(): void;
`,
);

execFileSync('npm', ['pack', '--pack-destination', '..'], { cwd: outDir, stdio: 'inherit' });
console.log(`\nBundled tarball: ${path.join(pkgDir, 'n8n-test-0.2.0.tgz')}`);
