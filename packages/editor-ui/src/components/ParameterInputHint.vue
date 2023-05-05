<template>
	<n8n-text size="small" color="text-base" tag="div" v-if="hint">
		<div v-if="!renderHTML" :class="classes">{{ hint }}</div>
		<div
			v-else
			ref="hint"
			:class="{ [$style.singleline]: singleLine, [$style.highlight]: highlight }"
			v-html="sanitizeHtml(hint)"
		></div>
	</n8n-text>
</template>

<script lang="ts">
import { sanitizeHtml } from '@/utils';
import { defineComponent } from 'vue';

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
				[this.$style['preserve-whitespace']]: true,
			};
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
.preserve-whitespace {
	white-space: pre;
}
</style>
