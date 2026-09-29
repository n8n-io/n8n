<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getAgentBudgetSpend } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';
import { formatBudgetUsd, parseBudgetAmount } from '../utils/budget-config';
import AgentBudgetMonthlyModal from './AgentBudgetMonthlyModal.vue';
import AgentBudgetSessionModal from './AgentBudgetSessionModal.vue';
import AgentPanel from './AgentPanel.vue';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		projectId: string;
		agentId: string;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const rootStore = useRootStore();
const monthlyOpen = ref(false);
const sessionOpen = ref(false);
const spentUsd = ref<number | undefined>();
const spendState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
let spendRequest = 0;

const budget = computed(() => props.config?.config?.guardrails?.budget);
const monthlyBudget = computed(() => parseBudgetAmount(budget.value?.monthlyBudgetUsd));
const sessionCap = computed(() => parseBudgetAmount(budget.value?.sessionCostCapUsd));

const usagePercent = computed(() => {
	const limit = monthlyBudget.value;
	const spent = spentUsd.value;
	if (limit === undefined || spent === undefined || limit <= 0) {
		return limit === 0 && spent !== undefined && spent > 0 ? 100 : 0;
	}
	return Math.min(100, Math.round((spent / limit) * 100));
});

async function loadSpend() {
	const request = ++spendRequest;
	if (monthlyBudget.value === undefined || !props.projectId || !props.agentId) {
		spendState.value = 'idle';
		spentUsd.value = undefined;
		return;
	}
	spendState.value = 'loading';
	try {
		const result = await getAgentBudgetSpend(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (request !== spendRequest) return;
		spentUsd.value = result.spentUsd;
		spendState.value = 'ready';
	} catch {
		if (request !== spendRequest) return;
		spentUsd.value = undefined;
		spendState.value = 'error';
	}
}

watch(
	[() => props.agentId, monthlyBudget],
	() => {
		loadSpend().catch(() => {
			spendState.value = 'error';
		});
	},
	{ immediate: true },
);

const monthlyValue = computed(() => {
	const amount = monthlyBudget.value;
	if (amount === undefined) return i18n.baseText('agents.builder.budget.notSet');
	return i18n.baseText('agents.builder.budget.monthly.value', {
		interpolate: { amount: formatBudgetUsd(amount) },
	});
});

const sessionValue = computed(() => {
	const amount = sessionCap.value;
	if (amount === undefined) return i18n.baseText('agents.builder.budget.notSet');
	return formatBudgetUsd(amount);
});
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.builder.budget.title')"
		data-testid="agent-budget-panel"
	>
		<div :class="[shared.disabled && disabled, $style.body]">
			<div data-testid="agent-budget-usage" :class="budgetUsageRow">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.budget.usage.label') }}
				</N8nText>
				<N8nText v-if="monthlyBudget === undefined" size="small" :class="shared.dataEntrySubLabel">
					{{ i18n.baseText('agents.builder.budget.usage.none') }}
				</N8nText>
				<N8nText v-else-if="spendState === 'error'" size="small" :class="shared.dataEntrySubLabel">
					{{ i18n.baseText('agents.builder.budget.usage.unavailable') }}
				</N8nText>
				<template v-else-if="spendState === 'ready' && spentUsd !== undefined">
					<div :class="$style.usageLine">
						<N8nText size="small">
							{{
								i18n.baseText('agents.builder.budget.usage.spent', {
									interpolate: {
										spent: formatBudgetUsd(spentUsd),
										budget: formatBudgetUsd(monthlyBudget),
									},
								})
							}}
						</N8nText>
						<N8nText size="small">{{ usagePercent }}%</N8nText>
					</div>
					<div
						:class="$style.track"
						role="meter"
						:aria-valuenow="usagePercent"
						aria-valuemin="0"
						aria-valuemax="100"
					>
						<div :class="$style.fill" :style="{ width: `${usagePercent}%` }" />
					</div>
					<N8nText size="small" :class="shared.dataEntrySubLabel">
						{{ i18n.baseText('agents.builder.budget.usage.estimate') }}
					</N8nText>
				</template>
			</div>

			<button
				type="button"
				:class="$style.row"
				:disabled="disabled"
				data-testid="agent-budget-monthly-row"
				@click="monthlyOpen = true"
			>
				<span :class="$style.rowLabel">
					<N8nText step="sm" bold :class="shared.dataEntryLabel">
						{{ i18n.baseText('agents.builder.budget.monthly.label') }}
					</N8nText>
					<N8nText size="small" :class="shared.dataEntrySubLabel">
						{{ i18n.baseText('agents.builder.budget.monthly.hint') }}
					</N8nText>
				</span>
				<span :class="$style.rowValue">
					<N8nText size="small">{{ monthlyValue }}</N8nText>
					<N8nText
						v-if="monthlyBudget !== undefined && budget?.alertThresholdPercent !== undefined"
						size="small"
						:class="shared.dataEntrySubLabel"
						data-testid="agent-budget-alert-value"
					>
						{{
							i18n.baseText('agents.builder.budget.monthly.alert', {
								interpolate: { percent: budget.alertThresholdPercent },
							})
						}}
					</N8nText>
					<N8nIcon icon="chevron-right" />
				</span>
			</button>

			<button
				type="button"
				:class="$style.row"
				:disabled="disabled"
				data-testid="agent-budget-session-row"
				@click="sessionOpen = true"
			>
				<span :class="$style.rowLabel">
					<N8nText step="sm" bold :class="shared.dataEntryLabel">
						{{ i18n.baseText('agents.builder.budget.session.label') }}
					</N8nText>
					<N8nText size="small" :class="shared.dataEntrySubLabel">
						{{ i18n.baseText('agents.builder.budget.session.hint') }}
					</N8nText>
				</span>
				<span :class="$style.rowValue">
					<N8nText size="small">{{ sessionValue }}</N8nText>
					<N8nIcon icon="chevron-right" />
				</span>
			</button>
		</div>

		<AgentBudgetMonthlyModal
			:open="monthlyOpen"
			:config="config"
			@update:open="monthlyOpen = $event"
			@save="emit('update:config', $event)"
		/>
		<AgentBudgetSessionModal
			:open="sessionOpen"
			:config="config"
			@update:open="sessionOpen = $event"
			@save="emit('update:config', $event)"
		/>
	</AgentPanel>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.budgetUsageRow {
	display: flex;
	align-content: space-between;
}

.usageLine,
.rowValue {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.rowValue {
	flex-direction: column;
	align-items: flex-end;
}

.track {
	height: var(--spacing--2xs);
	border-radius: var(--radius--sm);
	background: var(--background--light);
	overflow: hidden;
}

.fill {
	height: 100%;
	background: var(--background--brand);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	padding: var(--spacing--2xs) 0;
	border: 0;
	background: transparent;
	text-align: left;
	cursor: pointer;
}

.row:disabled {
	cursor: default;
}

.rowLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
