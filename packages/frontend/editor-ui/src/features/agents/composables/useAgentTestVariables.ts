import { computed, reactive, type MaybeRefOrGetter, toValue } from 'vue';
import { collectAgentVariables, type AgentVariable } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';
import { formatTrustedMetadataFixedValue } from '../utils/nodeToolTrustedMetadata';

/** Values typed in the preview chat, per agent. They live for the editor session only. */
const valuesByAgent = reactive<Record<string, Record<string, string>>>({});

/** Own-property read, so names like `constructor` never hit Object.prototype. */
function readOwn(record: Record<string, string> | undefined, name: string): string | undefined {
	return record && Object.hasOwn(record, name) ? record[name] : undefined;
}

/** An empty fixed default means "no default". */
export function hasUsableDefault(variable: AgentVariable): boolean {
	const binding = variable.default;
	if (!binding) return false;
	return !(binding.mode === 'fixed' && binding.value === '');
}

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

	const values = computed(() => {
		const id = toValue(agentId);
		return Object.hasOwn(valuesByAgent, id) ? valuesByAgent[id] : {};
	});

	function getValue(name: string): string {
		return readOwn(values.value, name) ?? '';
	}

	function setValue(name: string, value: string) {
		const id = toValue(agentId);
		const next: Record<string, string> = Object.create(null) as Record<string, string>;
		Object.assign(next, Object.hasOwn(valuesByAgent, id) ? valuesByAgent[id] : {});
		next[name] = value;
		valuesByAgent[id] = next;
	}

	/** Only filled entries for variables the agent still reads. */
	const payload = computed<Record<string, string> | undefined>(() => {
		const entries: Array<[string, string]> = [];
		for (const { name } of variables.value) {
			const value = readOwn(values.value, name);
			if (value !== undefined && value !== '') entries.push([name, value]);
		}
		return entries.length ? Object.fromEntries(entries) : undefined;
	});

	return { variables, values, getValue, setValue, payload };
}
