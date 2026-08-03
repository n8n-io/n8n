<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { N8nTag } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

const aiGatewayStore = useAiGatewayStore();
const i18n = useI18n();

const text = computed(() => {
	const balance = aiGatewayStore.balance;
	if (balance === undefined) return undefined;
	return balance <= 0
		? i18n.baseText('aiGateway.wallet.noCredits')
		: i18n.baseText('aiGateway.wallet.balanceRemaining', {
				interpolate: { balance: `$${balance.toFixed(2)}` },
			});
});

// No enabled-check needed: this tag only mounts inside the n8n Connect
// section, which is only built when the AI gateway is enabled.
onMounted(() => {
	void aiGatewayStore.fetchWallet();
});
</script>

<template>
	<N8nTag
		v-if="text"
		:class="$style.creditsBalance"
		:clickable="false"
		:text="text"
		data-test-id="node-creator-credits-balance"
	/>
</template>

<style lang="scss" module>
// N8nTag has no size below `sm`, and the bold category header would leak its
// font-weight into the tag, so both are pinned here to match the design.
// Element selector bumps specificity above N8nTag's own size class.
span.creditsBalance {
	margin-right: var(--spacing--3xs);
	height: auto;
	padding: var(--spacing--5xs) var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
}
</style>
