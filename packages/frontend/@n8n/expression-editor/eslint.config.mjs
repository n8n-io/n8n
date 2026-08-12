import { frontendConfig } from '@n8n/eslint-config/frontend';
import { defineConfig } from 'eslint/config';

export default defineConfig(frontendConfig, {
	rules: {
		// CodeMirror themes are CSS-in-JS (`.cm-content`, `&.cm-focused`), DOM
		// attributes are hyphenated, and Vue emit names are `update:model-value`.
		// None of them can be camelCase.
		'@typescript-eslint/naming-convention': 'off',
	},
});
