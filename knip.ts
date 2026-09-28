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
	// Manifest `types` and `exports` fields make a local dist an entry. `ignore` only mutes
	// findings in these files; a stale dist reports imports the source no longer has.
	ignore: ['dist/**'],
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
		unlisted: 'error',
		unresolved: 'off',
		binaries: 'off',
		catalogReferences: 'error',
		cycles: 'off',
	},
	workspaces: {
		'.': {
			entry: ['scripts/**/*.{mjs,js,ts}'],
			ignoreDependencies: [
				// Invoked by path in the n8n-module-sdk script.
				'@n8n/module-cli',
				// scripts/mutation-health runs stryker through a resolved binary path.
				'@stryker-mutator/core',
				'@stryker-mutator/vitest-runner',
				// Manual dev tool; CONTRIBUTING.md documents `pnpm exec dotenvx run`.
				'@dotenvx/dotenvx',
				// scripts/instance-seeding resolves it from packages/cli by path.
				'flatted',
				// scripts/generate-emoji-data.mjs is a manual generator; install emojibase-data ad hoc.
				'emojibase-data',
				// Only named in JSDoc type imports; @stryker-mutator/core provides it.
				'@stryker-mutator/api',
			],
		},
		// Not a pnpm workspace; the release and CI scripts carry their own manifest and lockfile.
		'.github/scripts': {
			entry: ['**/*.mjs'],
			ignoreDependencies: [
				// docker/kafka-native-smoke-check.mjs requires it from the n8n install under test.
				'@confluentinc/kafka-javascript',
				// The generate-sbom script runs the cdxgen binary; the package is not installed here.
				'@cyclonedx/cdxgen',
				// conventional-changelog loads the preset by name.
				'conventional-changelog-angular',
			],
		},
		'packages/**': pkg(),
		// Only tsconfig files, so the shared entry pattern has nothing to match.
		'packages/@n8n/typescript-config': pkg({ entry: [] }),
		'packages/cli': pkg({
			ignoreDependencies: [
				// bin/n8n has no extension, so knip does not parse it.
				'dotenv',
				'source-map-support',
				// scripts/build.mjs runs these binaries from inside template strings.
				'mjml',
				'@redocly/cli',
				// Declared so community nodes resolve it from the n8n install.
				'@n8n/ai-node-sdk',
				// psl is loaded with a dynamic import, which knip does not link to @types.
				'@types/psl',
			],
		}),
		'packages/@n8n/instance-ai': pkg({
			// psl is loaded with a dynamic import, which knip does not link to @types.
			ignoreDependencies: ['@types/psl'],
		}),
		'packages/@n8n/typeorm': pkg({
			// uuid is imported in src/query-builder; knip does not link it to @types here.
			ignoreDependencies: ['@types/uuid'],
		}),
		'packages/@n8n/oxlint-config': pkg({
			// The exported config names these plugins as strings.
			ignoreDependencies: [
				'@n8n/eslint-config',
				'@stylistic/eslint-plugin',
				'eslint-plugin-lodash',
				'eslint-plugin-unused-imports',
			],
		}),
		'packages/@n8n/nodes-langchain': pkg({
			ignoreDependencies: [
				// Pinned so npm installs of the published package resolve one langgraph version.
				'@langchain/langgraph',
				'@langchain/langgraph-checkpoint',
				// Only referenced through vi.mock() in a test.
				'uuid',
			],
		}),
		'packages/@n8n/ai-workflow-builder.ee': pkg({
			// Pinned so npm installs of the published package resolve one langgraph version.
			ignoreDependencies: ['@langchain/langgraph-checkpoint'],
		}),
		'packages/nodes-base': pkg({
			// Pins the pg version that pg-promise resolves for npm installs of the published package.
			ignoreDependencies: ['pg'],
		}),
		'packages/@n8n/create-node': pkg({
			// bin/create-node.cjs spawns the n8n-node binary through require.resolve.
			ignoreDependencies: ['@n8n/node-cli'],
		}),
		'packages/modules/instance-registry/frontend': pkg({
			// tsconfig.json reaches into design-system/src through rootDirs and types.
			ignoreDependencies: ['@n8n/design-system'],
		}),
		'packages/workflow': pkg({
			// Only named in JSDoc type imports; @stryker-mutator/core provides it.
			ignoreDependencies: ['@stryker-mutator/api'],
		}),
		'packages/@n8n/scheduler': pkg({
			// Only named in JSDoc type imports; @stryker-mutator/core provides it.
			ignoreDependencies: ['@stryker-mutator/api'],
		}),
		'packages/@n8n/benchmark': pkg({
			// The k6 runtime provides its own modules; only @types/k6 is installed.
			ignoreDependencies: ['k6'],
		}),
		'packages/@n8n/backend-common': pkg({
			// module-registry resolves the installed n8n package by path at runtime.
			ignoreDependencies: ['n8n'],
		}),
		'packages/core': pkg({
			// bin/generate-node-defs and bin/copy-static-files have no extension, so knip does not parse them.
			ignoreDependencies: ['@n8n/workflow-sdk', 'p-limit'],
		}),
		'packages/@n8n/node-cli': pkg({
			// Scaffold templates carry their own package.json and are not workspaces.
			ignore: ['src/template/**', 'dist/**'],
			// Imported only by the ignored AI scaffold templates.
			ignoreDependencies: ['@n8n/ai-node-sdk'],
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
				// .oxlintrc.json names these plugins; @n8n/oxlint-config provides them.
				'@stylistic/eslint-plugin',
				'eslint-plugin-lodash',
				'eslint-plugin-unused-imports',
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
		'packages/frontend/@n8n/design-system': pkg({
			// The compiled .mdx pages import storybook-addon-vue-mdx/jsx-runtime from this package.
			ignoreDependencies: ['storybook-addon-vue-mdx'],
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
			ignoreDependencies: [
				// The e2e suite runs against the built app; the edge orders the turbo build.
				'n8n',
				'n8n-core',
				// Manual `pnpm exec playwright-cli` runs; .gitignore lists its .playwright-cli dir.
				'@playwright/cli',
			],
		}),
	},
};

export default config;
