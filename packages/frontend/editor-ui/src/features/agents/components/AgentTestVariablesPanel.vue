<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	describeVariableDefault,
	hasUsableDefault,
	useAgentTestVariables,
} from '../composables/useAgentTestVariables';
import type { AgentJsonConfig } from '../types';

const props = defineProps<{
	agentId: string;
	config: AgentJsonConfig | null;
}>();

const i18n = useI18n();
const expanded = ref(false);

const { variables, getValue, setValue } = useAgentTestVariables(
	() => props.agentId,
	() => props.config,
);

const rows = computed(() =>
	variables.value.map((variable) => {
		const text = describeVariableDefault(variable);
		const placeholder = !hasUsableDefault(variable)
			? i18n.baseText('agents.variables.test.placeholder.required')
			: text === undefined
				? i18n.baseText('agents.variables.test.placeholder.expression')
				: i18n.baseText('agents.variables.test.placeholder.default', {
						interpolate: { value: text },
					});
		return { name: variable.name, placeholder };
	}),
);
</script>

<template>
	<div v-if="variables.length" :class="$style.panel" data-testid="agent-test-values-panel">
		<button
			type="button"
			:class="$style.trigger"
			:aria-expanded="expanded"
			data-testid="agent-test-values-toggle"
			@click="expanded = !expanded"
		>
			<N8nText size="small" bold>{{ i18n.baseText('agents.variables.test.title') }}</N8nText>
			<N8nIcon
				:icon="expanded ? 'chevron-up' : 'chevron-down'"
				size="small"
				color="text-light"
				aria-hidden="true"
			/>
		</button>
		<div v-if="expanded" :class="$style.content" data-testid="agent-test-values-content">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.variables.test.hint') }}
			</N8nText>
			<label v-for="row in rows" :key="row.name" :class="$style.field">
				<code :class="$style.name">{{ row.name }}</code>
				<N8nInput
					:model-value="getValue(row.name)"
					:placeholder="row.placeholder"
					size="small"
					:aria-label="
						i18n.baseText('agents.variables.test.inputLabel', { interpolate: { name: row.name } })
					"
					data-testid="agent-test-value-input"
					@update:model-value="setValue(row.name, $event)"
				/>
			</label>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border: 0;
	padding: 0;
	background: transparent;
	color: inherit;
	cursor: pointer;
	text-align: left;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}
</style>
