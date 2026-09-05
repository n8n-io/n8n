import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * Deliberately bare. No `resolve.alias` for `@n8n/*`, no icon plugin, no SCSS
 * `additionalData` — the point of this app is to prove `@n8n/design-system`
 * resolves and renders through its published `exports` map alone, exactly as it
 * would in a repo that has no n8n build machinery.
 */
export default defineConfig({
	plugins: [vue()],
	build: { outDir: 'dist' },
});
