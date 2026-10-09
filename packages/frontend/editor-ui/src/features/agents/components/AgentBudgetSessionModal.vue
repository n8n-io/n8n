<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nButton, N8nInputNumber, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentJsonConfig } from '../types';
import { parseBudgetAmount, sessionCapSave } from '../utils/budget-config';
import AgentModal from './modals/AgentModal.vue';

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

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		amount.value = parseBudgetAmount(props.config?.config?.guardrails?.budget?.sessionCostCapUsd);
	},
	{ immediate: true },
);

function onAmount(value: number | null | undefined) {
	amount.value = parseBudgetAmount(value);
}

function save() {
	emit('save', sessionCapSave(props.config, amount.value));
	emit('update:open', false);
}
</script>

<template>
	<AgentModal
		:open="open"
		size="small"
		:title="i18n.baseText('agents.builder.budget.session.modalTitle')"
		data-testid="agent-budget-session-modal"
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
					data-testid="agent-budget-session-amount"
					@update:model-value="onAmount"
				>
					<template #prefix>{{ i18n.baseText('agents.builder.budget.currencyPrefix') }}</template>
				</N8nInputNumber>
				<N8nText size="small" :class="$style.suffix">{{
					i18n.baseText('agents.builder.budget.session.suffix')
				}}</N8nText>
			</label>
			<N8nText size="small" :class="$style.hint">
				{{ i18n.baseText('agents.builder.budget.session.stop') }}
			</N8nText>
		</div>
		<template #footerActions>
			<N8nButton :disabled="disabled" data-testid="agent-budget-session-save" @click="save">
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
</style>
