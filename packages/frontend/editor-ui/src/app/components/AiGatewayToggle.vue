<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nCallout, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const props = defineProps<{
	aiGatewayEnabled: boolean;
	readonly: boolean;
	credentialType?: string;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const { creditsRemaining, fetchCredits } = useAiGateway();

const badgeHovered = ref(false);

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
				<span
					:class="$style.tokensBadge"
					@mouseenter="badgeHovered = true"
					@mouseleave="badgeHovered = false"
					@click="
						uiStore.openModalWithData({
							name: AI_GATEWAY_TOP_UP_MODAL_KEY,
							data: { credentialType: props.credentialType },
						})
					"
				>
					<span :class="[$style.badgeLabel, badgeHovered && $style.badgeLabelHidden]">
						{{
							i18n.baseText('aiGateway.toggle.tokensRemaining', {
								interpolate: { count: String(creditsRemaining) },
							})
						}}
					</span>
					<span :class="[$style.badgeLabel, !badgeHovered && $style.badgeLabelHidden]">
						{{ i18n.baseText('aiGateway.toggle.topUp') }}
					</span>
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
	display: grid;
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--callout--border-color--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	cursor: pointer;
	user-select: none;
	transition:
		background-color 0.15s,
		color 0.15s;

	&:hover {
		background-color: var(--color--success--shade-1);
		color: var(--color--neutral-white);
	}
}

.badgeLabel {
	grid-area: 1 / 1;
	text-align: center;
	transition: opacity 0.15s;
}

.badgeLabelHidden {
	opacity: 0;
	pointer-events: none;
}
</style>
