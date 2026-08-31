<script setup lang="ts">
import { N8nExternalLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { REQUEST_NODE_FORM_URL, SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';

const props = withDefaults(defineProps<{ variant?: 'node' | 'service' }>(), {
	variant: 'service',
});

const i18n = useI18n();
const posthogStore = usePostHog();

const suggestionUrl = computed(() => {
	if (props.variant === 'node') return REQUEST_NODE_FORM_URL;

	const url = posthogStore.getFeatureFlagPayload(SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY);
	if (typeof url !== 'string') return REQUEST_NODE_FORM_URL;

	try {
		return ['http:', 'https:'].includes(new URL(url).protocol) ? url : REQUEST_NODE_FORM_URL;
	} catch {
		return REQUEST_NODE_FORM_URL;
	}
});

const copyKeys = {
	node: {
		prompt: 'nodeCreator.noResults.needNativeIntegration',
		action: 'nodeCreator.noResults.suggestNode',
	},
	service: {
		prompt: 'tools.connection.suggestion.prompt',
		action: 'tools.connection.suggestion.action',
	},
} as const;
</script>

<template>
	<div :class="$style.footer" data-test-id="suggest-tool-footer">
		<N8nText size="small" color="text-light">
			{{ i18n.baseText(copyKeys[props.variant].prompt) }}
		</N8nText>
		<N8nExternalLink
			:class="[$style.link, 'ignore-key-press-node-creator']"
			:href="suggestionUrl"
			size="small"
		>
			{{ i18n.baseText(copyKeys[props.variant].action) }}
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
