<script setup lang="ts">
import { watch, computed } from 'vue';
import { N8nActionPill } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
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
const telemetry = useTelemetry();

const { balance, fetchWallet } = useAiGateway();

const isBalanceDepleted = computed(() => balance.value !== undefined && balance.value <= 0);

// Fetch when enabled (on mount if already enabled, or when toggled on)
watch(
	() => props.aiGatewayEnabled,
	(enabled) => {
		if (enabled) void fetchWallet();
	},
	{ immediate: true },
);

// Refresh after each execution completes so the badge reflects consumed balance.
watch(
	() => workflowsStore.workflowExecutionData,
	(executionData) => {
		if (
			(executionData?.finished || executionData?.stoppedAt !== undefined) &&
			props.aiGatewayEnabled
		) {
			void fetchWallet();
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
	telemetry.track('User clicked ai gateway top up', {
		source: 'credential_selector',
		credential_type: props.credentialType,
	});
	uiStore.openModalWithData({
		name: AI_GATEWAY_TOP_UP_MODAL_KEY,
		data: { credentialType: props.credentialType },
	});
}
</script>

<template>
	<div
		:class="[$style.wrapper, !aiGatewayEnabled && $style.withGap]"
		data-test-id="ai-gateway-selector"
	>
		<div role="radiogroup" :aria-label="i18n.baseText('aiGateway.credentialMode.sectionLabel')">
			<button
				type="button"
				role="radio"
				:aria-checked="aiGatewayEnabled"
				:disabled="readonly"
				data-test-id="ai-gateway-selector-connect"
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
				<N8nActionPill
					v-if="aiGatewayEnabled && balance !== undefined"
					:clickable="!readonly"
					:type="isBalanceDepleted ? 'danger' : 'default'"
					size="small"
					:text="
						isBalanceDepleted
							? i18n.baseText('aiGateway.wallet.noCredits')
							: i18n.baseText('aiGateway.wallet.balanceRemaining', {
									interpolate: { balance: `$${Number(balance).toFixed(2)}` },
								})
					"
					:hover-text="!readonly ? i18n.baseText('aiGateway.toggle.topUp') : undefined"
					@click="onBadgeClick"
				/>
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
}

.withGap {
	margin-bottom: var(--spacing--2xs);
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
		color: var(--color--text--shade-1);
	}

	.subtitle {
		color: var(--color--text--tint-1);
	}
}

.cardIdle {
	&:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--color--foreground) 30%, transparent);
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
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
	flex: 1;
}

.title {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.subtitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
	color: var(--color--text--tint-2);
	white-space: nowrap;
}
</style>
