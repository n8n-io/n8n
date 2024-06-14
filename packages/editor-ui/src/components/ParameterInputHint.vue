<template>
	<n8n-text v-if="hint" size="small" color="text-base" tag="div">
		<div v-if="!renderHTML" :class="classes"><span v-html="simplyText"></span></div>
		<div
			v-else
			ref="hint"
			:class="{ [$style.singleline]: singleLine, [$style.highlight]: highlight }"
			v-html="sanitizeHtml(hint)"
		></div>
	</n8n-text>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useCssModule } from 'vue';
import { sanitizeHtml } from '@/utils/htmlUtils';

const props = defineProps<{
	hint?: string;
	highlight?: boolean;
	singleLine?: boolean;
	renderHTML?: boolean;
}>();

const $style = useCssModule();

const classes = computed(() => ({
	[$style.singleline]: props.singleLine,
	[$style.highlight]: props.highlight,
}));

const simplyText = computed((): string => {
	if (props.hint) {
		return String(props.hint)
			.replace(/&/g, '&amp;') // allows us to keep spaces at the beginning of an expression
			.replace(/</g, '&lt;') // prevent XSS exploits since we are rendering HTML
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/ /g, '&nbsp;');
	}

	return '';
});

const hintRef = ref<HTMLElement | null>(null);

onMounted(() => {
	if (hintRef.value) {
		hintRef.value.querySelectorAll('a').forEach((a) => (a.target = '_blank'));
	}
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
