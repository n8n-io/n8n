import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
	// Relative asset URLs, so the local server can serve the build from any port.
	base: './',
	plugins: [vue()],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		// A local tool: one large bundle is fine.
		chunkSizeWarningLimit: 8000,
	},
});
