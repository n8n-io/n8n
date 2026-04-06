<script setup lang="ts">
import { watch } from 'vue';
import { N8nCallout, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

const props = defineProps<{
	aiGatewayEnabled: boolean;
	readonly: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const { creditsRemaining, fetchCredits } = useAiGateway();

// Fetch when enabled (on mount if already enabled, or when toggled on)
watch(
	() => props.aiGatewayEnabled,
	(enabled) => {
		if (enabled) void fetchCredits();
	},
	{ immediate: true },
);

// Refresh after each execution completes so the badge reflects consumed credits.
// An execution is considered done when finished===true (saved runs) or stoppedAt is set
// (step/test runs) — mirrors the same check used in workflows.store.ts.
watch(
	() => workflowsStore.workflowExecutionData,
	(executionData) => {
		if (
			(executionData?.finished || executionData?.stoppedAt !== undefined) &&
			props.aiGatewayEnabled
		) {
			void fetchCredits();
		}
	},
);
</script>

<template>
	<div :class="$style.wrapper" data-test-id="ai-gateway-toggle">
		<div :class="$style.toggleRow">
			<N8nSwitch2
				:model-value="props.aiGatewayEnabled"
				data-test-id="ai-gateway-toggle-switch"
				@update:model-value="(val) => emit('toggle', Boolean(val))"
				:disabled="props.readonly"
			/>
			<N8nText size="small" color="text-dark">
				{{ i18n.baseText('aiGateway.toggle.label') }}
			</N8nText>
		</div>
		<N8nCallout v-if="props.aiGatewayEnabled" theme="success" iconless>
			{{ i18n.baseText('aiGateway.toggle.description') }}
			<template v-if="creditsRemaining !== undefined" #trailingContent>
				<span :class="$style.tokensBadge">
					{{
						i18n.baseText('aiGateway.toggle.tokensRemaining', {
							interpolate: { count: String(creditsRemaining) },
						})
					}}
				</span>
			</template>
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.toggleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.tokensBadge {
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--callout--border-color--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--success--shade-1);
	white-space: nowrap;
}
</style>
