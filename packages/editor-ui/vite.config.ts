import vue from '@vitejs/plugin-vue2';
import path, { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import { sentryVitePlugin } from '@sentry/vite-plugin';

import packageJSON from './package.json';

const { coverageReporters } = require('../../jest.config.js');

const vendorChunks = ['vue', 'vue-router'];
const n8nChunks = ['n8n-workflow', 'n8n-design-system'];
const ignoreChunks = [
	'vue2-boring-avatars',
	'vue-template-compiler',
	'@fontsource/open-sans',
	'normalize-wheel',
	// TODO: remove this. It's currently required by xml2js in NodeErrors
	'stream-browserify',
];

const isScopedPackageToIgnore = (str: string) => /@codemirror\//.test(str);

function renderChunks() {
	const { dependencies } = packageJSON;
	const chunks: Record<string, string[]> = {};

	Object.keys(dependencies).forEach((key) => {
		if ([...vendorChunks, ...n8nChunks, ...ignoreChunks].includes(key)) {
			return;
		}

		if (isScopedPackageToIgnore(key)) return;

		chunks[key] = [key];
	});

	return chunks;
}

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const { NODE_ENV } = process.env;

const alias = [
	{ find: '@', replacement: resolve(__dirname, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	{
		find: /^n8n-design-system\//,
		replacement: resolve(__dirname, '..', 'design-system', 'src') + '/',
	},
	...['orderBy', 'camelCase', 'cloneDeep', 'isEqual', 'startCase'].map((name) => ({
		find: new RegExp(`^lodash.${name}$`, 'i'),
		replacement: require.resolve(`lodash-es/${name}`),
	})),
	{
		find: /^lodash\.(.+)$/,
		replacement: 'lodash-es/$1',
	},
	{
		find: 'vue2-boring-avatars',
		replacement: require.resolve('vue2-boring-avatars'),
	},
	{
		find: /element-ui\/(packages|lib)\/button$/,
		replacement: path.resolve(
			__dirname,
			'..',
			'design-system/src/components/N8nButton/overrides/ElButton.ts',
		),
	},
];

const plugins = [vue()];

const { SENTRY_AUTH_TOKEN: authToken, RELEASE: release } = process.env;
if (release && authToken) {
	plugins.push(
		sentryVitePlugin({
			org: 'n8nio',
			project: 'instance-frontend',
			// Specify the directory containing build artifacts
			include: './dist',
			// Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
			// and needs the `project:releases` and `org:read` scopes
			authToken,
			telemetry: false,
			release,
		}),
	);
}

export default mergeConfig(
	defineConfig({
		define: {
			// This causes test to fail but is required for actually running it
			...(NODE_ENV !== 'test' ? { global: 'globalThis' } : {}),
			...(NODE_ENV === 'development' ? { process: { env: {} } } : {}),
			BASE_PATH: `'${publicPath}'`,
		},
		plugins,
		resolve: { alias },
		base: publicPath,
		envPrefix: 'VUE_APP',
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: '\n@use "@/n8n-theme-variables.scss" as *;\n',
				},
			},
		},
		build: {
			assetsInlineLimit: 0,
			minify: !!release,
			sourcemap: !!release,
			rollupOptions: {
				treeshake: !!release,
				output: {
					manualChunks: {
						vendor: vendorChunks,
						n8n: n8nChunks,
						...renderChunks(),
					},
				},
			},
		},
	}),
	defineVitestConfig({
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
			coverage: {
				provider: 'c8',
				reporter: coverageReporters,
				all: true,
			},
			css: {
				modules: {
					classNameStrategy: 'non-scoped',
				},
			},
		},
	}),
);
