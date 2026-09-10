<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	opportunityCount: number;
	canApply: boolean;
}>();

const emit = defineEmits<{
	dismiss: [];
	neverShowAgain: [];
	reviewAndSwitch: [];
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
	<div :class="$style.container" data-test-id="gateway-opportunity-nudge">
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
			<N8nButton
				v-if="props.canApply"
				variant="solid"
				size="small"
				:label="i18n.baseText('aiGateway.opportunityNudge.cta')"
				data-test-id="gateway-opportunity-nudge-review-and-switch"
				@click="emit('reviewAndSwitch')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
// The toast is a fixed 330px and clips what does not fit, so the content must
// never be wider than the space it gets.
.container {
	max-width: 100%;
	min-width: 0;
	overflow-wrap: anywhere;
}

// Three buttons do not fit on one line in the space the toast leaves. Let them
// wrap so the primary action drops to its own line instead of being cut off.
.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}
</style>
