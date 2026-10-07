import { defineConfig } from 'vize/config';
import { vizeConfig } from '@n8n/oxlint-config/vize';

export default defineConfig({
	...vizeConfig,
	entries: [
		{
			// TODO: Move the row key to the `<template v-for>`, as Vue 3 expects.
			files: ['src/components/N8nDatatable/Datatable.vue'],
			linter: { rules: { 'vue/require-v-for-key': 'off' } },
		},
	],
});
