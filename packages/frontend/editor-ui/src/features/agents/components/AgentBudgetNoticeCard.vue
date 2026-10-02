<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nCard, N8nInputNumber, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import {
	parseBudgetAmount,
	type BudgetAmountField,
	type BudgetNoticeCode,
} from '../utils/budget-config';

const COPY: Record<
	BudgetNoticeCode,
	{ title: BaseTextKey; message: BaseTextKey; input: BaseTextKey; dismissed: BaseTextKey }
> = {
	'budget.monthly': {
		title: 'agents.chat.budget.monthly.title',
		message: 'agents.chat.budget.monthly.message',
		input: 'agents.chat.budget.monthly.input',
		dismissed: 'agents.chat.budget.monthly.dismissed',
	},
	'budget.session': {
		title: 'agents.chat.budget.session.title',
		message: 'agents.chat.budget.session.message',
		input: 'agents.chat.budget.session.input',
		dismissed: 'agents.chat.budget.session.dismissed',
	},
	'budget.alert': {
		title: 'agents.chat.budget.alert.title',
		message: 'agents.chat.budget.alert.message',
		input: 'agents.chat.budget.alert.input',
		dismissed: 'agents.chat.budget.alert.dismissed',
	},
};

const props = withDefaults(
	defineProps<{
		code: BudgetNoticeCode;
		/** False when the user cannot edit the agent — the increase action is hidden. */
		canIncrease?: boolean;
		/** True while the cap increase is being saved. */
		pending?: boolean;
	}>(),
	{ canIncrease: false, pending: false },
);

const emit = defineEmits<{
	increase: [payload: { field: BudgetAmountField; amount: number }];
}>();

const i18n = useI18n();
const dismissed = ref(false);
const amount = ref<number | undefined>();

const copy = computed(() => COPY[props.code]);
const field = computed<BudgetAmountField>(() =>
	props.code === 'budget.session' ? 'sessionCostCapUsd' : 'monthlyBudgetUsd',
);

function onAmount(value: number | null | undefined) {
	amount.value = parseBudgetAmount(value);
}

function increase() {
	const value = amount.value;
	if (value === undefined || props.pending) return;
	emit('increase', { field: field.value, amount: value });
}
</script>

<template>
	<N8nCard :class="$style.card" data-testid="agent-budget-notice-card">
		<div :class="$style.body">
			<N8nText tag="p" bold :class="$style.title" data-testid="agent-budget-notice-title">
				{{ i18n.baseText(copy.title) }}
			</N8nText>
			<N8nText tag="p" size="small" :class="$style.message">
				{{ i18n.baseText(copy.message) }}
			</N8nText>
			<N8nText v-if="dismissed" size="small" data-testid="agent-budget-notice-dismissed">
				{{ i18n.baseText(copy.dismissed) }}
			</N8nText>
			<template v-else>
				<label v-if="canIncrease" :class="$style.amount">
					<N8nText size="small">{{ i18n.baseText(copy.input) }}</N8nText>
					<N8nInputNumber
						:model-value="amount"
						:min="0"
						:controls="false"
						:disabled="pending"
						data-testid="agent-budget-notice-amount"
						@update:model-value="onAmount"
					/>
				</label>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="medium"
						:disabled="pending"
						data-testid="agent-budget-notice-not-now"
						@click="dismissed = true"
					>
						{{ i18n.baseText('agents.chat.budget.notNow') }}
					</N8nButton>
					<N8nButton
						v-if="canIncrease"
						size="medium"
						:loading="pending"
						data-testid="agent-budget-notice-increase"
						@click="increase"
					>
						{{ i18n.baseText('agents.chat.budget.increase') }}
					</N8nButton>
				</div>
			</template>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	width: 90%;
	max-width: 90%;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.title,
.message {
	margin: 0;
}

.title {
	font-size: var(--font-size--sm);
}

.amount {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}
</style>
