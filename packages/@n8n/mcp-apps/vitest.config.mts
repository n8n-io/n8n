import vue from '@vitejs/plugin-vue';
import { createVitestConfig } from '@n8n/vitest-config/frontend';
import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(createVitestConfig({ setupFiles: [] }), {
	plugins: [vue()],
	resolve: {
		alias: {
			'@mcp-apps': resolve(__dirname, 'src'),
			'@n8n/design-system': resolve(__dirname, '../../frontend/@n8n/design-system/src'),
		},
	},
});
