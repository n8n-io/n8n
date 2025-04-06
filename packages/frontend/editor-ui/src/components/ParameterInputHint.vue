<script setup lang="ts">
import { sanitizeHtml } from '@/utils/htmlUtils';
import { computed, onMounted, ref } from 'vue';

type Props = {
	hint: string;
	highlight?: boolean;
	singleLine?: boolean;
	renderHTML?: boolean;
};

const hintTextRef = ref<HTMLDivElement>();

const props = withDefaults(defineProps<Props>(), {
	highlight: false,
	singleLine: false,
	renderHTML: false,
});

onMounted(() => {
	if (hintTextRef.value) {
		hintTextRef.value.querySelectorAll('a').forEach((a) => (a.target = '_blank'));
	}
});

const simplyText = computed(() => {
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
</script>

<template>
	<n8n-text v-if="hint" size="small" color="text-base" tag="div">
		<div
			v-if="!renderHTML"
			:class="{
				[$style.singleline]: singleLine,
				[$style.highlight]: highlight,
			}"
		>
			<span v-n8n-html="simplyText" data-test-id="parameter-input-hint"></span>
		</div>
		<div
			v-else
			ref="hintTextRef"
			v-n8n-html="sanitizeHtml(hint)"
			:class="{ [$style.singleline]: singleLine, [$style.highlight]: highlight }"
		></div>
	</n8n-text>
</template>

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
