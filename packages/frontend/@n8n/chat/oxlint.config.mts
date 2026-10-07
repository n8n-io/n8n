import { defineConfig } from 'oxlint';
import { vueConfig } from '@n8n/oxlint-config/vue';

export default defineConfig({
	extends: [vueConfig],
	// The ESLint frontend layer does not lint declaration files either.
	ignorePatterns: ['**/*.d.ts'],
});
