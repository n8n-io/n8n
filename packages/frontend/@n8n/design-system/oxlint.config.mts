import { defineConfig } from 'oxlint';
import { vueConfig } from '@n8n/oxlint-config/vue';

export default defineConfig({
	extends: [vueConfig],
	// oxlint does not inherit `settings` through `extends`.
	settings: vueConfig.settings,
	// The ESLint frontend layer does not lint declaration files either.
	ignorePatterns: ['**/*.d.ts'],
	overrides: [
		{
			// TODO: Move the row key to the `<template v-for>`, as Vue 3 expects.
			files: ['src/components/N8nDatatable/Datatable.vue'],
			rules: { 'vize/vue/require-v-for-key': 'off' },
		},
	],
});
