<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nAiGatewayCreditsTag } from '@n8n/design-system';
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

function selectGateway(): void {
	if (props.readonly || props.aiGatewayEnabled) return;
	emit('toggle', true);
}

function selectOwnCredential(): void {
	if (props.readonly || !props.aiGatewayEnabled) return;
	emit('toggle', false);
}

function onBadgeClick(event: MouseEvent): void {
	event.stopPropagation();
	if (props.readonly) return;
	uiStore.openModalWithData({
		name: AI_GATEWAY_TOP_UP_MODAL_KEY,
		data: { credentialType: props.credentialType },
	});
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="ai-gateway-toggle">
		<div role="radiogroup" :aria-label="i18n.baseText('aiGateway.credentialMode.sectionLabel')">
			<button
				type="button"
				role="radio"
				:aria-checked="aiGatewayEnabled"
				:disabled="readonly"
				data-test-id="ai-gateway-toggle-switch"
				:class="[$style.card, aiGatewayEnabled ? $style.cardSelected : $style.cardIdle]"
				@click="selectGateway"
			>
				<span :class="$style.cardMain">
					<span
						:class="[$style.radioOuter, aiGatewayEnabled && $style.radioOuterOn]"
						aria-hidden="true"
					/>
					<span :class="$style.textBlock">
						<span :class="$style.title">
							{{ i18n.baseText('aiGateway.credentialMode.n8nConnect.title') }}
						</span>
						<span :class="$style.subtitle">
							{{ i18n.baseText('aiGateway.credentialMode.n8nConnect.subtitle') }}
						</span>
					</span>
				</span>
				<N8nAiGatewayCreditsTag
					v-if="aiGatewayEnabled && creditsRemaining !== undefined"
					:clickable="!readonly"
					:pressed="badgeHovered"
					@mouseenter="badgeHovered = true"
					@mouseleave="badgeHovered = false"
					@click="onBadgeClick"
				>
					<span :class="$style.badgeGrid">
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
				</N8nAiGatewayCreditsTag>
			</button>

			<button
				type="button"
				role="radio"
				:aria-checked="!aiGatewayEnabled"
				:disabled="readonly"
				data-test-id="ai-gateway-mode-card-own"
				:class="[$style.card, !aiGatewayEnabled ? $style.cardSelected : $style.cardIdle]"
				@click="selectOwnCredential"
			>
				<span :class="$style.cardMain">
					<span
						:class="[$style.radioOuter, !aiGatewayEnabled && $style.radioOuterOn]"
						aria-hidden="true"
					/>
					<span :class="$style.textBlock">
						<span :class="$style.title">
							{{ i18n.baseText('aiGateway.credentialMode.own.title') }}
						</span>
						<span :class="$style.subtitle">
							{{ i18n.baseText('aiGateway.credentialMode.own.subtitle') }}
						</span>
					</span>
				</span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing--4xs);
	margin-bottom: var(--spacing--xs);
}

.card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	text-align: left;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	cursor: pointer;
	background: transparent;
	font: inherit;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease;

	&:not(:last-child) {
		margin-bottom: var(--spacing--2xs);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.85;
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.cardSelected {
	background-color: var(--color--foreground);
	border-color: var(--color--foreground--shade-1);

	.title {
		color: var(--color--text);
		font-weight: var(--font-weight--bold);
	}

	.subtitle {
		color: var(--color--text--tint-1);
	}
}

.cardIdle {
	&:hover:not(:disabled) {
		background-color: var(--color--foreground--tint-2);
	}
}

.cardMain {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
}

.radioOuter {
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
	width: 1rem;
	height: 1rem;
	border-radius: 50%;
	border: var(--border-width) var(--border-style) var(--color--text--tint-2);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.radioOuterOn {
	border-color: var(--color--primary);

	&::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background-color: var(--color--primary);
		transform: translate(-50%, -50%);
	}
}

.textBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.title {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
	color: var(--color--text--tint-1);
}

.subtitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
	color: var(--color--text--tint-2);
}

.badgeGrid {
	display: grid;
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
