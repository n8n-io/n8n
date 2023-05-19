<template>
	<n8n-text size="small" color="text-base" tag="div" v-if="hint">
		<div v-if="!renderHTML" :class="classes"><span v-html="simplyText"></span></div>
		<div
			v-else
			ref="hint"
			:class="{ [$style.singleline]: singleLine, [$style.highlight]: highlight }"
			v-html="sanitizeHtml(hint)"
		></div>
	</n8n-text>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { sanitizeHtml } from '@/utils';

export default defineComponent({
	name: 'InputHint',
	props: {
		hint: {
			type: String,
		},
		highlight: {
			type: Boolean,
		},
		singleLine: {
			type: Boolean,
		},
		renderHTML: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		sanitizeHtml,
	},
	computed: {
		classes() {
			return {
				[this.$style.singleline]: this.singleLine,
				[this.$style.highlight]: this.highlight,
			};
		},
		simplyText(): string {
			if (this.hint) {
				return String(this.hint)
					.replace(/&/g, '&amp;') // allows us to keep spaces at the beginning of an expression
					.replace(/</g, '&lt;') // prevent XSS exploits since we are rendering HTML
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/ /g, '&nbsp;');
			}

			return '';
		},
	},
	mounted() {
		if (this.$refs.hint) {
			(this.$refs.hint as Element).querySelectorAll('a').forEach((a) => (a.target = '_blank'));
		}
	},
});
</script>

<style lang="scss" module>
.singleline {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.highlight {
	color: var(--color-secondary);
}
</style>
