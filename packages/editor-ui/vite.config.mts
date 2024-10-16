import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

import { vitestConfig } from '../design-system/vite.config.mts';
import icons from 'unplugin-icons/vite';
import iconsResolver from 'unplugin-icons/resolver';
import components from 'unplugin-vue-components/vite';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const { NODE_ENV } = process.env;

const alias = [
	{ find: '@', replacement: resolve(__dirname, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	{
		find: /^n8n-design-system$/,
		replacement: resolve(__dirname, '..', 'design-system', 'src', 'main.ts'),
	},
	{
		find: /^n8n-design-system\//,
		replacement: resolve(__dirname, '..', 'design-system', 'src') + '/',
	},
	{
		find: /^@n8n\/chat$/,
		replacement: resolve(__dirname, '..', '@n8n', 'chat', 'src', 'index.ts'),
	},
	{
		find: /^@n8n\/chat\//,
		replacement: resolve(__dirname, '..', '@n8n', 'chat', 'src') + '/',
	},
	...['orderBy', 'camelCase', 'cloneDeep', 'startCase'].map((name) => ({
		find: new RegExp(`^lodash.${name}$`, 'i'),
		replacement: `lodash-es/${name}`,
	})),
	{
		find: /^lodash\.(.+)$/,
		replacement: 'lodash-es/$1',
	},
];

const plugins = [
	icons({
		compiler: 'vue3',
		autoInstall: true,
	}),
	components({
		dts: './src/components.d.ts',
		resolvers: [
			iconsResolver({
				prefix: 'icon',
			}),
		],
	}),
	vue(),
];

const { SENTRY_AUTH_TOKEN: authToken, RELEASE: release } = process.env;
if (release && authToken) {
	plugins.push(
		sentryVitePlugin({
			org: 'n8nio',
			project: 'instance-frontend',
			// Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
			// and needs the `project:releases` and `org:read` scopes
			authToken,
			telemetry: false,
			release: {
				name: release,
			},
		}),
	);
}

export default mergeConfig(
	defineConfig({
		define: {
			// This causes test to fail but is required for actually running it
			// ...(NODE_ENV !== 'test' ? { 'global': 'globalThis' } : {}),
			...(NODE_ENV === 'development' ? { 'process.env': {} } : {}),
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
			minify: !!release,
			sourcemap: !!release,
		},
	}),
	vitestConfig,
);
