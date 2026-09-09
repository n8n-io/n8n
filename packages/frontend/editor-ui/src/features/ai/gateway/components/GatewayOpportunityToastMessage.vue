<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	opportunityCount: number;
}>();

const emit = defineEmits<{
	dismiss: [];
	neverShowAgain: [];
}>();

const i18n = useI18n();

const message = computed(() =>
	i18n.baseText('aiGateway.opportunityNudge.message', {
		adjustToNumber: props.opportunityCount,
		interpolate: { count: props.opportunityCount },
	}),
);
</script>

<template>
	<div data-test-id="gateway-opportunity-nudge">
		<N8nText size="small" tag="p" color="text-base">
			{{ message }}
		</N8nText>
		<div :class="$style.actions">
			<N8nButton
				variant="ghost"
				size="small"
				:label="i18n.baseText('aiGateway.opportunityNudge.neverShowAgain')"
				data-test-id="gateway-opportunity-nudge-never-show-again"
				@click="emit('neverShowAgain')"
			/>
			<N8nButton
				variant="subtle"
				size="small"
				:label="i18n.baseText('aiGateway.opportunityNudge.dismiss')"
				data-test-id="gateway-opportunity-nudge-dismiss"
				@click="emit('dismiss')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}
</style>
