<template>
	<n8n-text size="small" color="text-base" tag="div" v-if="hint">
		<div v-if="!renderHTML" :class="{ [$style.hint]: true, [$style.highlight]: highlight }">
			{{ hint }}
		</div>
		<div
			v-else
			ref="hint"
			:class="{ [$style.hint]: true, [$style.highlight]: highlight }"
			v-html="sanitizeHtml(hint)"
		></div>
	</n8n-text>
</template>

<script lang="ts">
import { sanitizeHtml } from '@/utils';
import Vue from 'vue';

export default Vue.extend({
	name: 'InputHint',
	props: {
		hint: {
			type: String,
		},
		highlight: {
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
	mounted() {
		if (this.$refs.hint) {
			(this.$refs.hint as Element).querySelectorAll('a').forEach((a) => (a.target = '_blank'));
		}
	},
});
</script>

<style lang="scss" module>
.hint {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.highlight {
	color: var(--color-secondary);
}
</style>
