<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useAIGatewayStore } from './aiGateway.store';
import { N8nCallout, N8nText } from '@n8n/design-system';

const GATEWAY_NODE_TYPES = [
	'@n8n/n8n-nodes-langchain.lmChatN8nAiGateway',
	'@n8n/n8n-nodes-langchain.openRouterAiGateway',
];
const SETTINGS_URL = '/settings/credits';

const ndvStore = useNDVStore();
const gatewayStore = useAIGatewayStore();

onMounted(async () => {
	await gatewayStore.initialize();
});

const isGatewayNode = computed(
	() => !!ndvStore.activeNode && GATEWAY_NODE_TYPES.includes(ndvStore.activeNode.type),
);
const credits = computed(() => gatewayStore.creditsRemaining);
const hasCredits = computed(() => credits.value !== null && credits.value > 0);
const isVisible = computed(() => isGatewayNode.value && gatewayStore.enabled);

function formatCredits(amount: number | null): string {
	if (amount === null) return '$0.00';
	return `$${amount.toFixed(2)}`;
}
</script>

<template>
	<div
		v-if="isVisible && hasCredits"
		:class="$style.notice"
		data-test-id="ai-gateway-credits-notice"
	>
		<p :class="$style.description">
			n8n AI Gateway is a unified platform for interacting with hundreds of models
		</p>
		<p :class="$style.credits">
			You have <strong>{{ formatCredits(credits) }} of free credits</strong> remaining.
			<a :href="SETTINGS_URL" target="_blank">Learn more</a>
		</p>
	</div>

	<N8nCallout
		v-else-if="isVisible && !hasCredits"
		theme="danger"
		icon="circle-exclamation"
		:class="$style.callout"
		data-test-id="ai-gateway-credits-depleted-notice"
	>
		<N8nText size="small">
			Your free AI Gateway credits have been used up. Top up to continue using models.
		</N8nText>
		<template #trailingContent>
			<a :href="SETTINGS_URL" target="_blank" :class="$style.topUpLink">Top up credits</a>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.notice {
	margin: var(--spacing--xs) 0 0;
	padding: var(--spacing--2xs);
	background-color: var(--notice--color--background--warning);
	border-width: 1px 1px 1px 7px;
	border-style: solid;
	border-color: var(--notice--border-color--warning);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--notice--color--text);
}

.description {
	margin: 0 0 var(--spacing--3xs);
}

.credits {
	margin: 0;

	a {
		font-weight: var(--font-weight--bold);
	}
}

.callout {
	margin: var(--spacing--xs) 0 0;
}

.topUpLink {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}
</style>
