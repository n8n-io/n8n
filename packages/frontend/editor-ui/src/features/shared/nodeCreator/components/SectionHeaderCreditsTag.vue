<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { N8nBadge } from '@n8n/design-system';
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
	<N8nBadge v-if="text" :class="$style.creditsBalance" data-test-id="node-creator-credits-balance">
		{{ text }}
	</N8nBadge>
</template>

<style lang="scss" module>
.creditsBalance {
	margin-right: var(--spacing--3xs);
}
</style>
