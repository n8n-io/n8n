<script setup lang="ts">
import { computed } from 'vue';
import type { WhatsAppMetaStatus } from '@n8n/api-types';
import { N8nCallout, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { metaTitleKey, presentWhatsAppMetaState } from './metaStatus';

const props = defineProps<{ status: WhatsAppMetaStatus | null }>();

const i18n = useI18n();

const presentation = computed(() =>
	props.status ? presentWhatsAppMetaState(props.status.state) : null,
);

// The design shows a circled cross for an error and a triangle for a warning.
const icon = computed(() =>
	presentation.value?.theme === 'danger' ? 'circle-x' : 'triangle-alert',
);

const interpolate = computed(() => ({
	number: props.status?.displayPhoneNumber ?? '',
	name: props.status?.displayName ?? '',
}));
</script>

<template>
	<N8nCallout
		v-if="presentation"
		:theme="presentation.theme"
		:icon="icon"
		:class="$style.callout"
		data-testid="whatsapp-meta-callout"
	>
		<div :class="$style.body">
			<N8nText
				size="medium"
				:color="presentation.theme === 'danger' ? 'danger' : 'text-dark'"
				:class="$style.title"
			>
				{{ i18n.baseText(metaTitleKey(presentation, props.status ?? {}), { interpolate }) }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText(presentation.descriptionKey) }}
			</N8nText>
		</div>
		<template v-if="presentation.action" #actions>
			<N8nLink
				:href="presentation.action.url"
				theme="text"
				size="small"
				:underline="false"
				:class="$style.action"
				target="_blank"
				rel="noopener noreferrer"
				data-testid="whatsapp-meta-callout-action"
			>
				{{ i18n.baseText(presentation.action.labelKey) }}
			</N8nLink>
		</template>
	</N8nCallout>
</template>

<style module lang="scss">
.callout {
	margin-bottom: var(--spacing--sm);
}

/*
 * The callout sizes its text to the text. Fill the row and the text, so the
 * action sits at the right edge for short text too.
 */
.callout > :first-child {
	flex: 1;
	min-width: 0;
}

.callout > :first-child > :global(.n8n-text) {
	flex: 1;
	min-width: 0;
}

.body {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
}

.title {
	font-weight: var(--font-weight--medium);
}

/* Keeps the link on one line, so a long description wraps and the link does not. */
.action {
	flex-shrink: 0;
	margin-left: var(--spacing--sm);
	white-space: nowrap;
}

/* The callout underlines every link inside it. This one is an action, so it stays plain. */
.callout .action,
.callout .action:hover {
	text-decoration: none;
}
</style>
