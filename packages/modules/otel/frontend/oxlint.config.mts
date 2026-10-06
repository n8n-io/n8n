import { defineConfig } from 'oxlint';
import { vueConfig } from '@n8n/oxlint-config/vue';

export default defineConfig({
	extends: [vueConfig],
	// oxlint does not inherit `settings` through `extends`.
	settings: vueConfig.settings,
});
