import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';

export default defineConfig({
	plugins: [pluginVue(), pluginSass()],
	source: {
		entry: {
			index: './src/main.ts',
		},
	},
});
