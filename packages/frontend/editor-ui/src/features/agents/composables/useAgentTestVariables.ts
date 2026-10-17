import { computed, reactive, type MaybeRefOrGetter, toValue } from 'vue';
import { collectAgentVariables, type AgentVariable } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';
import { formatTrustedMetadataFixedValue } from '../utils/nodeToolTrustedMetadata';

/** Values typed in the preview chat, per agent. They live for the editor session only. */
const valuesByAgent = reactive<Record<string, Record<string, string>>>({});

export function useAgentVariables(config: MaybeRefOrGetter<AgentJsonConfig | null | undefined>) {
	return computed<AgentVariable[]>(() => collectAgentVariables(toValue(config)?.tools));
}

/** Short text for a variable's default, or undefined when it has none. */
export function describeVariableDefault(variable: AgentVariable): string | undefined {
	const binding = variable.default;
	if (!binding) return undefined;
	if (binding.mode === 'expression') return undefined;
	return formatTrustedMetadataFixedValue(binding.value);
}

export function useAgentTestVariables(
	agentId: MaybeRefOrGetter<string>,
	config: MaybeRefOrGetter<AgentJsonConfig | null | undefined>,
) {
	const variables = useAgentVariables(config);

	const values = computed(() => valuesByAgent[toValue(agentId)] ?? {});

	function setValue(name: string, value: string) {
		const id = toValue(agentId);
		valuesByAgent[id] = { ...valuesByAgent[id], [name]: value };
	}

	/** Only filled entries for variables the agent still reads. */
	const payload = computed<Record<string, string> | undefined>(() => {
		const entries = variables.value
			.map(({ name }) => [name, values.value[name]] as const)
			.filter(([, value]) => value !== undefined && value !== '');
		return entries.length ? Object.fromEntries(entries) : undefined;
	});

	return { variables, values, setValue, payload };
}
