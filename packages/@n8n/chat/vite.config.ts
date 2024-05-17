import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';

const includeVue = process.env.INCLUDE_VUE === 'true';
const srcPath = fileURLToPath(new URL('./src', import.meta.url));

const plugins = [
	vue(),
	icons({
		compiler: 'vue3',
		autoInstall: true,
	}),
	dts(),
];
if (process.env.ENABLE_TYPE_CHECKING === 'true') {
	plugins.push(checker({ vueTsc: true }));
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins,
	resolve: {
		alias: {
			'@': srcPath,
			'@n8n/chat': srcPath,
			lodash: 'lodash-es',
		},
	},
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV ? `"${process.env.NODE_ENV}"` : '"development"',
	},
	build: {
		emptyOutDir: !includeVue,
		lib: {
			entry: resolve(__dirname, 'src', 'index.ts'),
			name: 'N8nChat',
			fileName: (format) => (includeVue ? `chat.bundle.${format}.js` : `chat.${format}.js`),
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			external: includeVue ? [] : ['vue'],
			output: {
				exports: 'named',
				// Provide global variables to use in the UMD build
				// for externalized deps
				globals: includeVue
					? {}
					: {
							vue: 'Vue',
					  },
			},
		},
	},
});
