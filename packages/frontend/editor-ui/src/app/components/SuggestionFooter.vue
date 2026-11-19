<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { computed } from 'vue';

const props = defineProps<{
	prompt: string;
	action: string;
	url?: string;
}>();

const suggestionUrl = computed(() => {
	if (!props.url) return undefined;

	try {
		return new URL(props.url).protocol === 'https:' ? props.url : undefined;
	} catch {
		return undefined;
	}
});
</script>

<template>
	<div v-if="suggestionUrl" :class="$style.footer" data-test-id="suggest-tool-footer">
		<N8nText size="small" color="text-light">
			{{ prompt }}
		</N8nText>
		<a
			:class="[$style.link, 'ignore-key-press-node-creator']"
			:href="suggestionUrl"
			target="_blank"
			rel="noopener noreferrer"
		>
			{{ action }}
		</a>
	</div>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--2xs);
	border-top: 1px solid var(--border-color);
}

.link {
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	text-decoration: none;

	&::after {
		content: '↗';
		margin-left: var(--spacing--5xs);
		text-decoration: none;
		display: inline-block;
	}

	&:hover {
		color: var(--color--primary);
		background: transparent;
	}
}
</style>
