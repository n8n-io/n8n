<script setup lang="ts">
import type { PromotionConfigCheckout } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	/** Undefined until the direction is saved on the server. */
	checkout: PromotionConfigCheckout | undefined;
	branchName: string;
	/** Which action is in flight, so the spinner lands on the clicked button. */
	busy: 'connect' | 'disconnect' | false;
	/** When set, Connect is blocked and this explains why (e.g. unsaved changes). */
	disabledReason?: string;
}>();

const emit = defineEmits<{
	connect: [];
	disconnect: [];
}>();

const i18n = useI18n();

type Status = 'blocked' | 'not-connected' | 'connected' | 'stale';

const status = computed<Status>(() => {
	if (!props.checkout) return 'blocked';
	if (!props.checkout.hasCheckout) return 'not-connected';
	return props.checkout.matchesConfig ? 'connected' : 'stale';
});

const isConnected = computed(() => props.checkout?.hasCheckout ?? false);
</script>

<template>
	<div :class="$style.status" data-test-id="promotion-checkout-status">
		<div :class="$style.state">
			<N8nIcon v-if="status === 'connected'" icon="circle-check" color="success" :size="16" />
			<N8nIcon v-else-if="status === 'stale'" icon="triangle-alert" color="warning" :size="16" />
			<N8nIcon v-else icon="circle-dot" color="text-light" :size="16" />

			<N8nText size="small" :color="status === 'stale' ? 'warning' : 'text-base'">
				<template v-if="status === 'connected'">
					{{
						i18n.baseText('settings.promotions.connection.checkout.connected', {
							interpolate: { branch: branchName },
						})
					}}
				</template>
				<template v-else-if="status === 'stale'">
					{{ i18n.baseText('settings.promotions.connection.checkout.stale') }}
				</template>
				<template v-else-if="disabledReason">{{ disabledReason }}</template>
				<template v-else>
					{{ i18n.baseText('settings.promotions.connection.checkout.notConnected') }}
				</template>
			</N8nText>
		</div>

		<div :class="$style.actions">
			<N8nButton
				v-if="isConnected"
				type="button"
				variant="outline"
				size="small"
				:disabled="!!disabledReason || busy === 'disconnect'"
				:loading="busy === 'connect'"
				data-test-id="promotion-checkout-reconnect"
				@click="emit('connect')"
			>
				{{ i18n.baseText('settings.promotions.connection.checkout.reconnect') }}
			</N8nButton>
			<N8nButton
				v-else
				type="button"
				size="small"
				:disabled="!!disabledReason || busy === 'disconnect'"
				:loading="busy === 'connect'"
				data-test-id="promotion-checkout-connect"
				@click="emit('connect')"
			>
				{{ i18n.baseText('settings.promotions.connection.checkout.connect') }}
			</N8nButton>
			<N8nButton
				v-if="isConnected"
				type="button"
				variant="outline"
				size="small"
				:disabled="busy === 'connect'"
				:loading="busy === 'disconnect'"
				data-test-id="promotion-checkout-disconnect"
				@click="emit('disconnect')"
			>
				{{ i18n.baseText('settings.promotions.connection.checkout.disconnect') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.status {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.state {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
