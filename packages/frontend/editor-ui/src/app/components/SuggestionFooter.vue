<script setup lang="ts">
import { N8nExternalLink, N8nText } from '@n8n/design-system';
import { computed } from 'vue';
import { usePostHog } from '@/app/stores/posthog.store';

export type SuggestionLinkSource = { type: 'url'; url: string } | { type: 'posthog'; key: string };

const props = defineProps<{
	prompt: string;
	action: string;
	linkSource: SuggestionLinkSource;
}>();

const posthogStore = usePostHog();

const suggestionUrl = computed(() => {
	const url =
		props.linkSource.type === 'url'
			? props.linkSource.url
			: posthogStore.getFeatureFlagPayload(props.linkSource.key);
	if (typeof url !== 'string') return undefined;

	try {
		return ['http:', 'https:'].includes(new URL(url).protocol) ? url : undefined;
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
		<N8nExternalLink
			:class="[$style.link, 'ignore-key-press-node-creator']"
			:href="suggestionUrl"
			size="small"
		>
			{{ action }}
		</N8nExternalLink>
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
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);

	&:hover {
		color: var(--color--primary);
		background: transparent;
	}
}
</style>
