<script setup lang="ts">
import { N8nAiGatewayCreditsTag } from '@n8n/design-system';
import { ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const props = defineProps<{
	/** When true, n8n Gateway (managed) is selected; when false, user's own credential. */
	aiGatewayEnabled: boolean;
	readonly: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const { creditsRemaining, fetchCredits } = useAiGateway();

const badgeHovered = ref(false);

watch(
	() => props.aiGatewayEnabled,
	(enabled) => {
		if (enabled) void fetchCredits();
	},
	{ immediate: true },
);

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

function onCreditsBadgeClick(event: MouseEvent): void {
	event.stopPropagation();
	if (props.readonly) return;
	uiStore.openModal(AI_GATEWAY_TOP_UP_MODAL_KEY);
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="ai-gateway-credential-mode">
		<div role="radiogroup" :aria-label="i18n.baseText('aiGateway.credentialMode.sectionLabel')">
			<button
				type="button"
				role="radio"
				:aria-checked="aiGatewayEnabled"
				:disabled="readonly"
				data-test-id="ai-gateway-mode-card-n8n"
				:class="[$style.card, aiGatewayEnabled ? $style.cardSelected : $style.cardIdle]"
				@click="selectGateway"
			>
				<span :class="$style.cardMain">
					<span
						:class="[$style.radioOuter, aiGatewayEnabled && $style.radioOuterOn]"
						aria-hidden="true"
					/>
					<span :class="$style.textBlock">
						<span
							:class="[$style.title, aiGatewayEnabled ? $style.titleOnSelected : $style.titleIdle]"
						>
							{{ i18n.baseText('aiGateway.credentialMode.n8nConnect.title') }}
						</span>
						<span
							:class="[
								$style.subtitle,
								aiGatewayEnabled ? $style.subtitleOnSelected : $style.subtitleIdle,
							]"
						>
							{{ i18n.baseText('aiGateway.credentialMode.n8nConnect.subtitle') }}
						</span>
					</span>
				</span>
				<span
					v-if="aiGatewayEnabled && creditsRemaining !== undefined"
					:class="$style.badgeWrap"
					@mouseenter="badgeHovered = true"
					@mouseleave="badgeHovered = false"
				>
					<N8nAiGatewayCreditsTag
						:clickable="!readonly"
						:pressed="badgeHovered"
						data-test-id="ai-gateway-credits-badge"
						@click="onCreditsBadgeClick"
					>
						<span :class="$style.badgeGrid">
							<span :class="[$style.badgeLabel, badgeHovered && $style.badgeLabelHidden]">
								{{
									i18n.baseText('aiGateway.credentialMode.creditsShort', {
										interpolate: { count: String(creditsRemaining) },
									})
								}}
							</span>
							<span :class="[$style.badgeLabel, !badgeHovered && $style.badgeLabelHidden]">
								{{ i18n.baseText('aiGateway.toggle.topUp') }}
							</span>
						</span>
					</N8nAiGatewayCreditsTag>
				</span>
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
						:class="[$style.radioOuter, !aiGatewayEnabled && $style.radioOuterOnOwn]"
						aria-hidden="true"
					/>
					<span :class="$style.textBlock">
						<span
							:class="[$style.title, !aiGatewayEnabled ? $style.titleOnSelected : $style.titleIdle]"
						>
							{{ i18n.baseText('aiGateway.credentialMode.own.title') }}
						</span>
						<span
							:class="[
								$style.subtitle,
								!aiGatewayEnabled ? $style.subtitleOnSelected : $style.subtitleIdle,
							]"
						>
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

.card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	text-align: left;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	font: inherit;
	transition:
		background-color 0.15s ease,
		box-shadow 0.15s ease;

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

.cardMain {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
	text-align: left;
}

/*
 * Surfaces align with N8nButton `subtle` (see design-system Button.vue &.subtle).
 * Selected: same fill as subtle hover; inset ring uses default `--border-color` (clearer than `--border-color--subtle`).
 */
.cardSelected {
	background-color: light-dark(var(--color--neutral-150), var(--color--neutral-700));
	box-shadow:
		inset 0 0 0 1px var(--border-color),
		0 1px 3px light-dark(var(--color--black-alpha-100), var(--color--black-alpha-300)),
		0 0 0 1.5px light-dark(transparent, var(--color--black-alpha-100));
}

.cardIdle {
	/* Same surface as the NDV parameter panel (`_tokens.scss` `--ndv--background--color`); border + shadow carry the control */
	background-color: var(--ndv--background--color);
	box-shadow:
		inset 0 0 0 1px light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100)),
		0 1px 3px light-dark(var(--color--black-alpha-100), var(--color--black-alpha-300)),
		0 0 0 1.5px light-dark(transparent, var(--color--black-alpha-100));

	&:hover:not(:disabled) {
		background-color: light-dark(var(--color--neutral-150), var(--color--neutral-700));
		box-shadow:
			inset 0 0 0 1px light-dark(var(--color--black-alpha-200), var(--color--white-alpha-300)),
			0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--black-alpha-300)),
			0 0 0 1px light-dark(transparent, var(--color--black-alpha-100));
	}
}

.radioOuter {
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
	width: 1rem;
	height: 1rem;
	border-radius: 50%;
	border: 1px solid var(--color--text--tint-2);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	line-height: 0;
	vertical-align: middle;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.radioOuterOn,
.radioOuterOnOwn {
	border: 1px solid var(--color--primary);
	background-color: transparent;

	&::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0.5rem;
		height: 0.5rem;
		margin: 0;
		border-radius: 50%;
		background-color: var(--color--primary);
		transform: translate(-50%, -50%);
	}
}

.textBlock {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
	text-align: left;
}

.title {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
}

/* shade-1 = primary text (light on dark theme); tint-1 matches subtitle for idle */
.titleOnSelected {
	color: var(--color--text--shade-1);
}

.titleIdle {
	color: var(--color--text--tint-1);
}

.subtitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
}

.subtitleOnSelected {
	color: var(--color--text--tint-1);
}

.subtitleIdle {
	color: var(--color--text--tint-1);
}

.badgeWrap {
	flex-shrink: 0;
}

.badgeGrid {
	display: grid;
}

.badgeLabel {
	grid-area: 1 / 1;
	text-align: center;
	transition: opacity 0.15s ease;
}

.badgeLabelHidden {
	opacity: 0;
	pointer-events: none;
}
</style>
