import './setup.mjs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	esbuild: {
		tsconfigRaw: JSON.stringify({
			compilerOptions: { target: 'ES2022', useDefineForClassFields: true },
		}),
	},
	resolve: {
		alias: {
			'@vue/test-utils': require.resolve('@vue/test-utils'),
			vue: fileURLToPath(new URL('./node_modules/vue/dist/vue.esm-bundler.js', import.meta.url)),
		},
	},
	server: { fs: { allow: ['../..'] } },
	test: {
		environment: 'jsdom',
		include: [
			'../../packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/*.test.ts',
		],
		maxWorkers: 1,
	},
});
