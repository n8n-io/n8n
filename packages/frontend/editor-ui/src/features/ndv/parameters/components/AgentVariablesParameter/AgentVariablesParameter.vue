<script lang="ts" setup>
import { computed, ref, shallowRef, watch } from 'vue';
import { collectAgentVariables, type AgentVariable } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeParameters, INodeProperties, NodeParameterValueType } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import { getAgentConfig } from '@/features/agents/composables/useAgentApi';
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import ParameterInputFull from '../ParameterInputFull.vue';

type Props = {
	parameter: INodeProperties;
	path: string;
	/** The `trustedValues` parameter value: `{ values: [{ name, value }] }`. */
	values?: Record<string, INodeParameters[] | INodeParameters>;
	nodeValues: INodeParameters;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), { values: undefined, isReadOnly: false });

const emit = defineEmits<{
	valueChanged: [value: { name: string; value: NodeParameterValueType }];
}>();

type Tools = Parameters<typeof collectAgentVariables>[0];
type Entry = { name: string; value: string };

const i18n = useI18n();
const rootStore = useRootStore();
const projectId = useAgentScopeProjectId();

const variables = shallowRef<AgentVariable[]>([]);
/** False while the agent cannot be resolved (nothing picked, expression, load error). */
const agentKnown = ref(false);
const loadFailed = ref(false);

const agentId = computed(() => {
	const raw = props.nodeValues.agentId;
	const value = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw;
	return typeof value === 'string' && value && !value.startsWith('=') ? value : '';
});
const isInline = computed(() => props.nodeValues.agentSource === 'inline');
const inlineTools = computed(() => {
	const inline = props.nodeValues.inlineAgent as { config?: { tools?: unknown } } | undefined;
	return inline?.config?.tools;
});

let requestId = 0;
async function loadVariables() {
	const current = ++requestId;
	loadFailed.value = false;
	if (isInline.value) {
		variables.value = collectAgentVariables(inlineTools.value as Tools);
		agentKnown.value = true;
		return;
	}
	if (!agentId.value || !projectId.value) {
		variables.value = [];
		agentKnown.value = false;
		return;
	}
	try {
		const { config } = await getAgentConfig(
			rootStore.restApiContext,
			projectId.value,
			agentId.value,
		);
		if (current !== requestId) return;
		variables.value = collectAgentVariables(config.tools as Tools);
		agentKnown.value = true;
	} catch {
		if (current !== requestId) return;
		variables.value = [];
		agentKnown.value = false;
		loadFailed.value = true;
	}
}

watch([agentId, isInline, inlineTools, projectId], loadVariables, { immediate: true });

const saved = computed<Entry[]>(() => {
	const raw = props.values?.values;
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((entry) => typeof entry?.name === 'string' && entry.name !== '')
		.map((entry) => ({
			name: entry.name as string,
			value: typeof entry.value === 'string' ? entry.value : String(entry.value ?? ''),
		}));
});

function describeDefault(variable: AgentVariable): string {
	const fallback = variable.default;
	if (!fallback) return '';
	return fallback.mode === 'expression'
		? fallback.value.replace(/^=\s*/, '')
		: typeof fallback.value === 'string'
			? fallback.value
			: JSON.stringify(fallback.value);
}

const rows = computed(() => {
	const savedByName = new Map(saved.value.map((entry) => [entry.name, entry.value]));
	const result = variables.value.map((variable) => ({
		name: variable.name,
		value: savedByName.get(variable.name) ?? '',
		placeholder: describeDefault(variable),
		tools: variable.tools,
		unused: false,
	}));
	if (agentKnown.value) {
		const known = new Set(variables.value.map((variable) => variable.name));
		for (const entry of saved.value) {
			if (!known.has(entry.name)) {
				result.push({ ...entry, placeholder: '', tools: [], unused: true });
			}
		}
	} else {
		// Agent not resolvable: keep saved values visible and removable.
		for (const entry of saved.value) {
			result.push({ ...entry, placeholder: '', tools: [], unused: false });
		}
	}
	return result;
});

function rowParameter(row: (typeof rows.value)[number]): INodeProperties {
	return {
		displayName: row.name,
		name: row.name,
		type: 'string',
		default: '',
		placeholder: row.placeholder || undefined,
		description: row.unused
			? i18n.baseText('ndv.messageAnAgent.variables.notUsed')
			: row.tools.length
				? i18n.baseText('ndv.messageAnAgent.variables.usedBy', {
						interpolate: { tools: row.tools.join(', ') },
					})
				: undefined,
	};
}

function commit(name: string, value: NodeParameterValueType) {
	const text = typeof value === 'string' ? value : value === undefined ? '' : String(value);
	// Keep the stored order stable: replace in place when the entry already exists.
	const merged: Entry[] = [];
	let placed = false;
	for (const entry of saved.value) {
		if (entry.name === name) {
			if (text !== '') merged.push({ name, value: text });
			placed = true;
		} else {
			merged.push(entry);
		}
	}
	if (!placed && text !== '') merged.push({ name, value: text });
	emit('valueChanged', {
		name: `${props.path}.values`,
		value: merged.length ? (merged as unknown as NodeParameterValueType) : undefined,
	});
}

function onUpdate(name: string, update: IUpdateInformation) {
	commit(name, update.value);
}
</script>

<template>
	<div :class="$style.container" data-test-id="agent-variables">
		<N8nText v-if="loadFailed" size="small" color="danger" data-test-id="agent-variables-error">
			{{ i18n.baseText('ndv.messageAnAgent.variables.loadError') }}
		</N8nText>
		<N8nText
			v-else-if="rows.length === 0"
			size="small"
			color="text-light"
			data-test-id="agent-variables-empty"
		>
			{{
				agentKnown
					? i18n.baseText('ndv.messageAnAgent.variables.none')
					: i18n.baseText('ndv.messageAnAgent.variables.selectAgent')
			}}
		</N8nText>
		<div
			v-for="(row, index) in rows"
			:key="row.name"
			:class="$style.row"
			:data-test-id="`agent-variable-${row.name}`"
		>
			<div :class="$style.input">
				<ParameterInputFull
					:parameter="rowParameter(row)"
					:value="row.value"
					:path="`${path}.values[${index}].value`"
					:is-read-only="isReadOnly"
					@update="onUpdate(row.name, $event)"
				/>
				<N8nText
					v-if="row.unused"
					size="small"
					color="warning"
					data-test-id="agent-variable-unused"
				>
					{{ i18n.baseText('ndv.messageAnAgent.variables.notUsed') }}
				</N8nText>
			</div>
			<N8nIconButton
				v-if="(row.unused || !agentKnown) && !isReadOnly"
				icon="trash-2"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('ndv.messageAnAgent.variables.remove')"
				data-test-id="agent-variable-remove"
				@click="commit(row.name, '')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.input {
	flex: 1;
	min-width: 0;
}
</style>
