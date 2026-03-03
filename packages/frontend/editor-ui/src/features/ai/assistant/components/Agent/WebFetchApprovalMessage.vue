<script setup lang="ts">
import { ref } from 'vue';

import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { WebFetchApproval } from '../../assistant.types';

interface Props {
	data: WebFetchApproval.MessageData;
	disabled?: boolean;
}

const props = defineProps<Props>();
const i18n = useI18n();

const emit = defineEmits<{
	decision: [
		payload: {
			requestId: string;
			url: string;
			domain: string;
			action: 'allow_once' | 'allow_domain' | 'deny';
		},
	];
}>();

const decided = ref(false);
const decisionLabel = ref('');

function onDecision(action: 'allow_once' | 'allow_domain' | 'deny') {
	decided.value = true;
	decisionLabel.value =
		action === 'deny'
			? i18n.baseText('aiAssistant.builder.webFetch.deny')
			: action === 'allow_domain'
				? i18n.baseText('aiAssistant.builder.webFetch.allowDomain', {
						interpolate: { domain: props.data.domain },
					})
				: i18n.baseText('aiAssistant.builder.webFetch.allowOnce');

	emit('decision', {
		requestId: props.data.requestId,
		url: props.data.url,
		domain: props.data.domain,
		action,
	});
}
</script>

<template>
	<div :class="$style.container">
		<N8nText :class="$style.prompt" size="small">
			{{ i18n.baseText('aiAssistant.builder.webFetch.prompt') }}
		</N8nText>
		<N8nText :class="$style.url" tag="code" size="small">
			{{ data.url }}
		</N8nText>
		<div v-if="!decided" :class="$style.actions">
			<N8nButton
				size="small"
				type="secondary"
				:disabled="disabled"
				@click="onDecision('allow_once')"
			>
				{{ i18n.baseText('aiAssistant.builder.webFetch.allowOnce') }}
			</N8nButton>
			<N8nButton
				size="small"
				type="secondary"
				:disabled="disabled"
				@click="onDecision('allow_domain')"
			>
				{{
					i18n.baseText('aiAssistant.builder.webFetch.allowDomain', {
						interpolate: { domain: data.domain },
					})
				}}
			</N8nButton>
			<N8nButton size="small" type="tertiary" :disabled="disabled" @click="onDecision('deny')">
				{{ i18n.baseText('aiAssistant.builder.webFetch.deny') }}
			</N8nButton>
		</div>
		<N8nText v-else :class="$style.decided" size="small" color="text-light">
			{{ decisionLabel }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background);
}

.prompt {
	font-weight: var(--font-weight--bold);
}

.url {
	word-break: break-all;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.decided {
	font-style: italic;
}
</style>
