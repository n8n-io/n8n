<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, useId, watch } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	extractNodeToolVariables,
	TrustedMetadataKeySchema,
	type NodeToolTrustedMetadata,
} from '@n8n/api-types';
import { WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE, type INodeProperties } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import { ExpressionLocalResolveContextSymbol, WorkflowDocumentStoreKey } from '@/app/constants';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import ParameterInputFull from '@/features/ndv/parameters/components/ParameterInputFull.vue';
import {
	deriveTrustedMetadataRows,
	formatTrustedMetadataFixedValue,
	trustedMetadataRowsToRecord,
	trustedMetadataValueError,
	type TrustedMetadataRow,
} from '../utils/nodeToolTrustedMetadata';

const props = defineProps<{
	toolName: string;
	/** Current node parameters of the tool. Variable names are read from them. */
	nodeParameters?: unknown;
	submitted?: boolean;
	disabled?: boolean;
}>();

const metadata = defineModel<NodeToolTrustedMetadata | undefined>();
const emit = defineEmits<{ 'update:valid': [valid: boolean] }>();
const i18n = useI18n();
const id = useId();

// Names the wire schema rejects can't be saved, so they never become rows.
const variableNames = computed(() =>
	extractNodeToolVariables(props.nodeParameters).filter(
		(name) => TrustedMetadataKeySchema.safeParse(name).success,
	),
);

/** Rows the user edited in this session. Other rows come from the stored defaults. */
const edited = ref<Record<string, TrustedMetadataRow>>({});

const rows = computed<TrustedMetadataRow[]>(() =>
	deriveTrustedMetadataRows(variableNames.value, metadata.value).map(
		(row) => edited.value[row.name] ?? row,
	),
);

function sameRecord(
	a: NodeToolTrustedMetadata | undefined,
	b: NodeToolTrustedMetadata | undefined,
) {
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function emitRows(next: TrustedMetadataRow[]) {
	const record = trustedMetadataRowsToRecord(next);
	if (!sameRecord(record, metadata.value)) metadata.value = record;
}

// Drop defaults of variables that the tool no longer reads.
watch(
	variableNames,
	() => {
		if (props.disabled) return;
		emitRows(rows.value);
	},
	{ immediate: true },
);

function commit(row: TrustedMetadataRow) {
	if (props.disabled) return;
	edited.value = { ...edited.value, [row.name]: row };
	emitRows(rows.value.map((r) => (r.name === row.name ? row : r)));
}

function updateValue(row: TrustedMetadataRow, update: IUpdateInformation) {
	const value =
		row.mode === 'fixed'
			? formatTrustedMetadataFixedValue(update.value)
			: String(update.value ?? '=');
	commit({ name: row.name, mode: row.mode, value });
}

function setMode(row: TrustedMetadataRow, mode: 'fixed' | 'expression' | 'ai') {
	if (row.mode === mode || mode === 'ai') return;
	commit({ name: row.name, mode, value: mode === 'expression' ? '=' : '' });
}

function parameterFor(row: TrustedMetadataRow): INodeProperties {
	return {
		displayName: row.name,
		name: 'value',
		type: 'string',
		default: '',
		typeOptions: { rows: 2 },
	};
}

function valueErrorText(row: TrustedMetadataRow): string {
	return i18n.baseText(
		`agents.toolConfig.metadata.value.${trustedMetadataValueError(row) ?? ''}` as BaseTextKey,
	);
}

const hasError = computed(() =>
	rows.value.some((row) => trustedMetadataValueError(row) !== undefined),
);
watch(hasError, (invalid) => emit('update:valid', !invalid), { immediate: true });

const documentId = createWorkflowDocumentId(`node-tool-trusted-metadata-${id}`);
const documentStore = useWorkflowDocumentStore(documentId);
const ndvStore = useNDVStore(documentId);
const executionStore = useWorkflowExecutionStateStore(documentId);
provide(
	WorkflowDocumentStoreKey,
	computed(() => documentStore),
);
provide(
	ExpressionLocalResolveContextSymbol,
	computed<ExpressionLocalResolveContext>(() => ({
		localResolve: true,
		nodeName: props.toolName,
		additionalKeys: {},
	})),
);
watch(
	() => props.toolName,
	(name) => {
		documentStore.setNodes([
			{
				id,
				name,
				type: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
				typeVersion: 2.2,
				position: [0, 0],
				parameters: {},
			},
		]);
		ndvStore.setActiveNodeName(name, 'other');
	},
	{ immediate: true },
);
onBeforeUnmount(() => {
	disposeNDVStore(ndvStore);
	disposeWorkflowExecutionStateStore(executionStore);
	disposeWorkflowDocumentStore(documentStore);
});
</script>

<template>
	<div
		v-if="rows.length > 0"
		:class="$style.metadata"
		data-test-id="agent-node-tool-trusted-metadata"
	>
		<div :class="$style.heading">
			<N8nText size="small" bold>{{ i18n.baseText('agents.toolConfig.metadata.title') }}</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.toolConfig.metadata.hint') }}
			</N8nText>
		</div>
		<div
			v-for="row in rows"
			:key="row.name"
			:class="$style.row"
			role="group"
			:aria-label="row.name"
			data-test-id="agent-trusted-metadata-row"
		>
			<div :class="$style.name">
				<N8nText size="small" bold data-test-id="agent-trusted-metadata-name">
					{{ row.name }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.toolConfig.metadata.default.label') }}
				</N8nText>
			</div>
			<div :class="$style.valueCell">
				<ParameterInputFull
					:parameter="parameterFor(row)"
					:value="row.value"
					:input-mode="row.mode"
					:path="`trustedMetadata.${row.name}`"
					:rows="2"
					:is-read-only="props.disabled"
					hide-label
					options-position="top-absolute"
					:display-options="true"
					:options-overrides="{ hideFocusPanelButton: true }"
					:disable-from-ai="true"
					:external-issues="
						props.submitted && trustedMetadataValueError(row) ? [valueErrorText(row)] : []
					"
					@update="updateValue(row, $event)"
					@text-input="updateValue(row, $event)"
					@update:input-mode="setMode(row, $event)"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.metadata {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.row {
	display: grid;
	grid-template-columns: minmax(140px, 220px) 1fr;
	gap: var(--spacing--2xs);
	align-items: start;
	min-width: 0;
}

.name {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-top: var(--spacing--2xs);
	overflow-wrap: anywhere;
}

.valueCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
