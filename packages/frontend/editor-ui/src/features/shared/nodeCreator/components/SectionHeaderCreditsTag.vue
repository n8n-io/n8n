<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { N8nTag } from '@n8n/design-system';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { formatWalletBalance } from '@/app/utils/aiGatewayUtils';

const aiGatewayStore = useAiGatewayStore();
const settingsStore = useSettingsStore();

const text = computed(() => formatWalletBalance(aiGatewayStore.balance));

onMounted(() => {
	if (settingsStore.isAiGatewayEnabled) {
		void aiGatewayStore.fetchWallet();
	}
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
