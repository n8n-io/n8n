import type { KnipConfig } from 'knip';

type Workspace = NonNullable<KnipConfig['workspaces']>[string];

// Dependency checks only. Every source file is an entry, so a dependency counts as
// used when any file in the package imports it, not only files reachable from main.
const sourceEntry = [
	'**/*.{ts,mts,cts,tsx,js,mjs,cjs,vue}',
	'!**/dist/**',
	'!**/coverage/**',
	'!**/.turbo/**',
];

// knip picks the deepest matching workspace key and does not merge, so every
// package override has to restate the shared defaults.
const pkg = (overrides: Workspace = {}): Workspace => ({
	entry: sourceEntry,
	// The default only reads tsconfig.json; build tsconfigs extend shared configs too.
	typescript: { config: ['tsconfig.json', 'tsconfig.*.json'] },
	// postcss is not a declared dependency, so the plugin needs to be forced on.
	postcss: { config: ['postcss.config.{js,cjs,mjs}'] },
	...overrides,
});

const config: KnipConfig = {
	rules: {
		dependencies: 'error',
		devDependencies: 'error',
		optionalPeerDependencies: 'error',
		catalog: 'error',
		files: 'off',
		exports: 'off',
		nsExports: 'off',
		types: 'off',
		nsTypes: 'off',
		enumMembers: 'off',
		namespaceMembers: 'off',
		duplicates: 'off',
		unlisted: 'off',
		unresolved: 'off',
		binaries: 'off',
		catalogReferences: 'off',
		cycles: 'off',
	},
	workspaces: {
		'.': {
			entry: ['scripts/**/*.{mjs,js,ts}', '.github/scripts/**/*.mjs'],
			ignoreDependencies: [
				// Invoked by path in the n8n-module-sdk script.
				'@n8n/module-cli',
				// scripts/mutation-health runs stryker through a resolved binary path.
				'@stryker-mutator/core',
				'@stryker-mutator/vitest-runner',
				// Manual dev tool; CONTRIBUTING.md documents `pnpm exec dotenvx run`.
				'@dotenvx/dotenvx',
			],
		},
		'packages/**': pkg(),
		'packages/cli': pkg({
			ignoreDependencies: [
				// bin/n8n has no extension, so knip does not parse it.
				'dotenv',
				'source-map-support',
				// scripts/build.mjs runs these binaries from inside template strings.
				'mjml',
				'@redocly/cli',
			],
		}),
		'packages/core': pkg({
			// bin/generate-node-defs has no extension, so knip does not parse it.
			ignoreDependencies: ['@n8n/workflow-sdk'],
		}),
		'packages/@n8n/node-cli': pkg({
			// Scaffold templates carry their own package.json and are not workspaces.
			ignore: ['src/template/**', 'dist/**'],
		}),
		'packages/@n8n/mcp-apps': pkg({
			// vite.config.mts throws unless a MCP app mode is set; vitest.config.mts still loads.
			vite: false,
		}),
		'packages/frontend/editor-ui': pkg({
			ignoreDependencies: [
				// The wasm file is copied by path in vite.config.mts.
				'web-tree-sitter',
				// Target of the `stream` alias that @n8n/frontend-vite-config declares.
				'stream-browserify',
			],
		}),
		'packages/frontend/@n8n/storybook': pkg({
			ignoreDependencies: [
				// Stories are resolved to the sibling packages' src through vite aliases.
				'@n8n/chat',
				'@n8n/composables',
				'@n8n/stores',
				'@n8n/utils',
				// Runs in the typecheck script; knip does not link the binary to the package here.
				'vue-tsc',
			],
		}),
		'packages/@n8n/stylelint-config': pkg({
			// The exported config names plugins and syntaxes as strings.
			ignoreDependencies: ['stylelint-scss', 'postcss-html', 'postcss-scss'],
		}),
		'packages/@n8n/mcp-browser': pkg({
			// Spawned as a binary through execFile.
			ignoreDependencies: ['agent-browser'],
		}),
		'packages/testing/playwright': pkg({
			// The e2e suite runs against the built app; the edge orders the turbo build.
			ignoreDependencies: ['n8n', 'n8n-core'],
		}),
	},
};

export default config;
