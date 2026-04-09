<script lang="ts" setup>
/**
 * Inactive: credit purchase UI (amount presets, custom input, `topUpCredits`).
 * Not imported by the app — kept so the flow can be restored when purchases go live.
 * Wire `AiGatewayTopUpModal` to render this inside `Modal` or `N8nDialog` when re-enabling.
 */
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nInputNumber, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

const PRESET_AMOUNTS = [10, 20, 50, 100] as const;
const FEEDBACK_FORM_URL = 'https://forms.gle/placeholder';

const i18n = useI18n();
const aiGatewayStore = useAiGatewayStore();

const selectedPreset = ref<number | null>(null);
const customAmount = ref<number | null>(null);
const isLoading = ref(false);
const showThankYou = ref(false);

const effectiveAmount = computed(() => {
	if (customAmount.value !== null && customAmount.value > 0) return customAmount.value;
	return selectedPreset.value;
});

const isBuyDisabled = computed(
	() => effectiveAmount.value === null || effectiveAmount.value <= 0 || isLoading.value,
);

function selectPreset(amount: number) {
	selectedPreset.value = selectedPreset.value === amount ? null : amount;
	customAmount.value = null;
}

function onCustomInput(value: number | null) {
	customAmount.value = value;
	if (value !== null && value > 0) {
		selectedPreset.value = null;
	}
}

function reset() {
	showThankYou.value = false;
	selectedPreset.value = null;
	customAmount.value = null;
}

async function onBuy() {
	if (effectiveAmount.value === null || effectiveAmount.value <= 0) return;
	isLoading.value = true;
	await aiGatewayStore.topUpCredits(effectiveAmount.value);
	isLoading.value = false;
	if (!aiGatewayStore.fetchError) {
		showThankYou.value = true;
	}
}

defineExpose({ reset });
</script>

<template>
	<div :class="$style.contentWrapper">
		<div v-if="!showThankYou" :class="$style.body">
			<N8nText color="text-base">
				{{ i18n.baseText('settings.n8nGateway.topUp.description') }}
			</N8nText>

			<div :class="$style.presets">
				<button
					v-for="amount in PRESET_AMOUNTS"
					:key="amount"
					:class="[$style.presetBtn, { [$style.presetBtnSelected]: selectedPreset === amount }]"
					data-test-id="ai-gateway-topup-preset"
					type="button"
					@click="selectPreset(amount)"
				>
					{{ amount }}
				</button>
			</div>

			<N8nInputNumber
				:class="$style.customInput"
				:model-value="customAmount"
				:min="1"
				:precision="0"
				:placeholder="i18n.baseText('settings.n8nGateway.topUp.customPlaceholder')"
				data-test-id="ai-gateway-topup-custom"
				@update:model-value="onCustomInput"
			/>
		</div>

		<div v-else :class="$style.thankYouBody">
			<N8nIcon icon="hourglass" size="xlarge" :class="$style.thankYouIcon" />
			<N8nText size="large" bold color="text-dark">Thank you for your interest!</N8nText>
			<N8nText color="text-base">Buying credits is currently in development.</N8nText>
			<N8nText color="text-base">
				Your feedback matters — it helps us build the right experience. Share your thoughts by
				filling out our short feedback form:
			</N8nText>
			<N8nLink :to="FEEDBACK_FORM_URL" new-window data-test-id="ai-gateway-topup-feedback-link">
				Open feedback form
			</N8nLink>
		</div>

		<div :class="[$style.footer, showThankYou && $style.footerHidden]">
			<N8nButton
				variant="subtle"
				size="large"
				:label="i18n.baseText('generic.cancel')"
				@click="reset"
			/>
			<N8nButton
				size="large"
				:label="i18n.baseText('settings.n8nGateway.topUp.buy')"
				:loading="isLoading"
				:disabled="isBuyDisabled"
				data-test-id="ai-gateway-topup-buy"
				@click="onBuy"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.contentWrapper {
	min-height: 220px;
	display: flex;
	flex-direction: column;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--xs) 0 var(--spacing--md);
}

.presets {
	display: flex;
	gap: var(--spacing--xs);
}

.presetBtn {
	flex: 1;
	padding: var(--spacing--sm) 0;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	transition:
		border-color 0.15s,
		background-color 0.15s;

	&:hover {
		border-color: var(--color--foreground--shade-2);
		background-color: var(--color--foreground--tint-1);
	}
}

.presetBtnSelected {
	border-color: var(--color--success);
	background-color: var(--color--success);
	color: var(--color--neutral-white);
}

.customInput {
	width: 100%;
}

.thankYouBody {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg) 0 var(--spacing--md);
	text-align: center;
}

.thankYouIcon {
	color: var(--color--secondary);
	margin-bottom: var(--spacing--2xs);
}

.footer {
	display: flex;
	justify-content: space-between;
	width: 100%;
}

.footerHidden {
	visibility: hidden;
}
</style>
