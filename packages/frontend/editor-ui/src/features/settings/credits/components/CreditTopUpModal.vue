<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDialogFooter,
	N8nButton,
} from '@n8n/design-system';
import { useCreditsStore } from '../credits.store';

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

const open = defineModel<boolean>('open', { default: false });

const selectedAmount = ref<number>(50);
const customAmount = ref<string>('');
const isCustom = ref(false);

const i18n = useI18n();
const creditsStore = useCreditsStore();

function selectPreset(amount: number) {
	selectedAmount.value = amount;
	isCustom.value = false;
	customAmount.value = '';
}

function enableCustom() {
	isCustom.value = true;
}

function handleConfirm() {
	const amount = isCustom.value ? parseFloat(customAmount.value) || 0 : selectedAmount.value;
	if (amount > 0) {
		creditsStore.topUp(amount);
		open.value = false;
	}
}
</script>

<template>
	<N8nDialog :open="open" size="small" @update:open="open = $event">
		<N8nDialogHeader>
			<N8nDialogTitle>{{ i18n.baseText('settings.credits.topUpModal.title') }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div :class="$style.body">
			<div :class="$style.presetGrid">
				<button
					v-for="amount in PRESET_AMOUNTS"
					:key="amount"
					:class="[
						$style.presetButton,
						{ [$style.presetButtonSelected]: !isCustom && selectedAmount === amount },
					]"
					type="button"
					@click="selectPreset(amount)"
				>
					${{ amount }}
				</button>
			</div>

			<div :class="$style.customRow">
				<button
					:class="[$style.customToggle, { [$style.customToggleActive]: isCustom }]"
					type="button"
					@click="enableCustom"
				>
					Custom
				</button>
				<div v-if="isCustom" :class="$style.customInputWrapper">
					<span :class="$style.currencyPrefix">$</span>
					<input
						v-model="customAmount"
						:class="$style.customInput"
						type="number"
						min="1"
						step="1"
						placeholder="0.00"
					/>
				</div>
			</div>
		</div>

		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('settings.credits.topUpModal.cancel')"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.credits.topUpModal.toPayment')"
				@click="handleConfirm"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	padding: var(--spacing--sm) var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.presetGrid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--xs);
}

.presetButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--sm) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;

	&:hover {
		border-color: var(--color--foreground--shade-1);
		background: var(--color--foreground--tint-2);
	}
}

.presetButtonSelected {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
}

.customRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.customToggle {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
	white-space: nowrap;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.customToggleActive {
	border-color: var(--color--primary);
	color: var(--color--primary);
}

.customInputWrapper {
	display: flex;
	align-items: center;
	flex: 1;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);

	&:focus-within {
		border-color: var(--color--primary);
	}
}

.currencyPrefix {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	margin-right: var(--spacing--3xs);
}

.customInput {
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	width: 100%;
	-moz-appearance: textfield;

	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
}
</style>
