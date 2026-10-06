<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nInputNumber, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentJsonConfig } from '../types';
import { monthlyBudgetSave, parseBudgetAmount, snapAlertPercent } from '../utils/budget-config';
import AgentModal from './modals/AgentModal.vue';
import BudgetAlertSlider from './BudgetAlertSlider.vue';

const props = withDefaults(
	defineProps<{
		open: boolean;
		config: AgentJsonConfig | null;
		/** Editing locked (read-only builder): keep the modal view-only so a save cannot be dropped by the locked autosave. */
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	save: [changes: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();
const amount = ref<number | undefined>();
const alertOn = ref(false);
const alertPercent = ref(80);

const hasAmount = () => amount.value !== undefined;

const alertPercentLabel = computed(() =>
	i18n.baseText('agents.builder.budget.alert.percent', {
		interpolate: { percent: alertPercent.value },
	}),
);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		const budget = props.config?.config?.guardrails?.budget;
		amount.value = parseBudgetAmount(budget?.monthlyBudgetUsd);
		const saved = budget?.alertThresholdPercent;
		alertOn.value = saved !== undefined && amount.value !== undefined;
		alertPercent.value = saved === undefined ? 80 : snapAlertPercent(saved);
	},
	{ immediate: true },
);

function onAmount(value: number | null | undefined) {
	amount.value = parseBudgetAmount(value);
	if (!hasAmount()) alertOn.value = false;
}

function onAlertToggle(value: boolean) {
	if (!hasAmount()) return;
	alertOn.value = value;
	if (value) alertPercent.value = snapAlertPercent(alertPercent.value);
}

function save() {
	emit(
		'save',
		monthlyBudgetSave(props.config, amount.value, {
			enabled: alertOn.value && hasAmount(),
			percent: alertPercent.value,
		}),
	);
	emit('update:open', false);
}
</script>

<template>
	<AgentModal
		:open="open"
		size="small"
		:title="i18n.baseText('agents.builder.budget.monthly.modalTitle')"
		data-testid="agent-budget-monthly-modal"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<label :class="$style.amountRow">
				<N8nInputNumber
					:model-value="amount"
					:min="0"
					:controls="false"
					:disabled="disabled"
					:class="$style.amountInput"
					data-testid="agent-budget-monthly-amount"
					@update:model-value="onAmount"
				>
					<template #prefix>{{ i18n.baseText('agents.builder.budget.currencyPrefix') }}</template>
				</N8nInputNumber>
				<N8nText size="small" :class="$style.suffix">{{
					i18n.baseText('agents.builder.budget.monthly.suffix')
				}}</N8nText>
			</label>
			<N8nText size="small" :class="$style.hint">
				{{ i18n.baseText('agents.builder.budget.monthly.stop') }}
			</N8nText>

			<div :class="$style.alert">
				<div :class="$style.alertCopy">
					<N8nText step="sm" bold>{{ i18n.baseText('agents.builder.budget.alert.label') }}</N8nText>
					<N8nText size="small" :class="$style.hint">
						{{ i18n.baseText('agents.builder.budget.alert.hint') }}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="alertOn"
					:disabled="disabled || !hasAmount()"
					size="small"
					:aria-label="i18n.baseText('agents.builder.budget.alert.label')"
					data-testid="agent-budget-alert-switch"
					@update:model-value="onAlertToggle"
				/>
			</div>
			<div v-if="alertOn && hasAmount()" :class="$style.slider">
				<N8nText size="small">
					{{ alertPercentLabel }}
				</N8nText>
				<BudgetAlertSlider v-model="alertPercent" :disabled="disabled" :label="alertPercentLabel" />
			</div>
		</div>
		<template #footerActions>
			<N8nButton :disabled="disabled" data-testid="agent-budget-monthly-save" @click="save">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
	max-width: 100%;
}

.amountRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.amountInput {
	flex: 1;
	min-width: 0;
}

.suffix {
	flex-shrink: 0;
	white-space: nowrap;
}

.hint {
	color: var(--text-color--subtler);
}

.alert {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.alertCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.slider {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
	max-width: 100%;
}
</style>
