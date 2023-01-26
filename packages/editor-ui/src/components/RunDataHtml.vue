<template>
	<div class="__html-display" v-html="html"></div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import type { INodeExecutionData } from 'n8n-workflow';

export default {
	name: 'RunDataHtml',
	props: {
		inputData: {
			type: Array as PropType<INodeExecutionData[]>,
		},
	},
	computed: {
		html() {
			if (!this.inputData) return '';

			return this.scopeCss(this.inputData[0].json.html as string);
		},
	},
	methods: {
		/**
		 * Scope all CSS selectors to prevent user stylesheets from leaking.
		 */
		scopeCss(str: string) {
			const stylesheets = str.match(/<style>([\s\S]*?)<\/style>/g);

			if (!stylesheets) return str;

			const map = stylesheets.reduce<Record<string, string>>((acc, match) => {
				match.split('\n').forEach((line) => {
					if (line.endsWith('{')) acc[line] = ['.__html-display', line].join(' ');
				});

				return acc;
			}, {});

			return Object.entries(map).reduce((acc, [key, value]) => acc.replace(key, value), str);
		},
	},
};
</script>

<style lang="scss">
.__html-display {
	padding: 0 var(--spacing-s);
}
</style>
