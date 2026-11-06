<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { getAiGatewayBalancePill } from '@/app/utils/formatters/aiGatewayBalanceFormatter';

const aiGatewayStore = useAiGatewayStore();
const i18n = useI18n();

const text = computed(() => getAiGatewayBalancePill(aiGatewayStore.balance, i18n)?.text);

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
