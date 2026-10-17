<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, useId, watch } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { NodeToolTrustedMetadata } from '@n8n/api-types';
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
	formatTrustedMetadataFixedValue,
	trustedMetadataNameError,
	trustedMetadataRowsToRecord,
	trustedMetadataValueError,
	type TrustedMetadataRow,
} from '../utils/nodeToolTrustedMetadata';

const props = defineProps<{
	toolName: string;
	submitted?: boolean;
	disabled?: boolean;
}>();

const metadata = defineModel<NodeToolTrustedMetadata | undefined>();
const emit = defineEmits<{ 'update:valid': [valid: boolean] }>();
const i18n = useI18n();
const id = useId();

interface RowEntry {
	/** Stable local key so renaming a row never remounts its inputs. */
	key: string;
	row: TrustedMetadataRow;
}

const rowIndex = ref(0);

const rowEntries = ref<RowEntry[]>([]);

// The component mounts per tool-modal open, so rows are read once from the
// persisted bindings; every later edit re-emits the full record.
function rowsFromMetadata(value: NodeToolTrustedMetadata | undefined): RowEntry[] {
	return Object.entries(value ?? {}).map(([name, binding]) => ({
		key: `${id}-row-${rowIndex.value++}`,
		row:
			binding.mode === 'fixed'
				? { name, mode: 'fixed', value: formatTrustedMetadataFixedValue(binding.value) }
				: { name, mode: 'expression', value: binding.value },
	}));
}
rowEntries.value = rowsFromMetadata(metadata.value);

function emitMetadata() {
	metadata.value = trustedMetadataRowsToRecord(rowEntries.value.map((entry) => entry.row));
}

function addRow() {
	if (props.disabled) return;
	rowEntries.value = [
		...rowEntries.value,
		{ key: `${id}-row-${rowIndex.value++}`, row: { name: '', mode: 'fixed', value: '' } },
	];
	emitMetadata();
}

function removeRow(key: string) {
	if (props.disabled) return;
	rowEntries.value = rowEntries.value.filter((entry) => entry.key !== key);
	emitMetadata();
}

function updateName(entry: RowEntry, name: string) {
	entry.row.name = name;
	emitMetadata();
}

function updateValue(entry: RowEntry, update: IUpdateInformation) {
	const raw = formatTrustedMetadataFixedValue(update.value);
	entry.row.value = entry.row.mode === 'fixed' ? raw : String(update.value ?? '=');
	emitMetadata();
}

function setMode(entry: RowEntry, mode: 'fixed' | 'expression' | 'ai') {
	if (entry.row.mode === mode || mode === 'ai') return;
	entry.row.mode = mode;
	entry.row.value = mode === 'expression' ? '=' : '';
	emitMetadata();
}

function parameterFor(row: TrustedMetadataRow): INodeProperties {
	return {
		displayName: row.name || 'value',
		name: 'value',
		type: 'json',
		default: '',
		typeOptions: { rows: 2 },
	};
}

function rowNameError(entry: RowEntry): string | undefined {
	const base = trustedMetadataNameError(entry.row);
	if (base) return base;
	// Flag every row after the first with the same name: the record keeps one.
	const name = entry.row.name.trim();
	const firstAt = rowEntries.value.findIndex((entry2) => entry2.row.name.trim() === name);
	return firstAt < rowEntries.value.indexOf(entry) ? 'duplicate' : undefined;
}

function rowValueError(entry: RowEntry): string | undefined {
	return trustedMetadataValueError(entry.row);
}

const hasError = computed(() =>
	rowEntries.value.some(
		(entry) => rowNameError(entry) !== undefined || rowValueError(entry) !== undefined,
	),
);
watch(hasError, (invalid) => emit('update:valid', !invalid), { immediate: true });

const errorBase = 'agents.toolConfig.metadata';

function nameErrorText(entry: RowEntry): string {
	const code = rowNameError(entry) ?? '';
	return i18n.baseText(`${errorBase}.name.${code}` as BaseTextKey);
}

function valueErrorText(entry: RowEntry): string {
	const code = rowValueError(entry) ?? '';
	return i18n.baseText(`${errorBase}.value.${code}` as BaseTextKey);
}

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
	<div :class="$style.metadata" data-test-id="agent-node-tool-trusted-metadata">
		<div :class="$style.header">
			<div :class="$style.heading">
				<N8nText size="small" bold>{{ i18n.baseText('agents.toolConfig.metadata.title') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.toolConfig.metadata.hint') }}
				</N8nText>
			</div>
			<N8nButton
				variant="ghost"
				size="small"
				:label="i18n.baseText('agents.toolConfig.metadata.add')"
				data-test-id="agent-trusted-metadata-add"
				:disabled="props.disabled"
				@click="addRow"
			/>
		</div>
		<N8nText v-if="rowEntries.length === 0" size="xsmall" color="text-light">
			{{ i18n.baseText('agents.toolConfig.metadata.empty') }}
		</N8nText>
		<div
			v-for="(entry, index) in rowEntries"
			:key="entry.key"
			:class="$style.row"
			role="group"
			:aria-label="entry.row.name || i18n.baseText('agents.toolConfig.metadata.add')"
		>
			<div :class="$style.nameCell">
				<N8nInput
					:model-value="entry.row.name"
					name="trustedMetadataName"
					:placeholder="i18n.baseText('agents.toolConfig.metadata.key.placeholder')"
					:disabled="props.disabled"
					@update:model-value="updateName(entry, String($event))"
				/>
				<N8nText
					v-if="props.submitted && rowNameError(entry)"
					size="xsmall"
					color="danger"
					role="alert"
				>
					{{ nameErrorText(entry) }}
				</N8nText>
			</div>
			<div :class="$style.valueCell">
				<ParameterInputFull
					:parameter="parameterFor(entry.row)"
					:value="entry.row.value"
					:input-mode="entry.row.mode"
					:path="`trustedMetadata.${index}`"
					:rows="2"
					:display-options="true"
					:options-overrides="{ hideFocusPanelButton: true }"
					:disable-from-ai="true"
					:external-issues="props.submitted && rowValueError(entry) ? [valueErrorText(entry)] : []"
					@update="updateValue(entry, $event)"
					@text-input="updateValue(entry, $event)"
					@update:input-mode="setMode(entry, $event)"
				/>
			</div>
			<N8nIconButton
				icon="trash-2"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('agents.toolConfig.metadata.remove')"
				data-test-id="agent-trusted-metadata-remove"
				:disabled="props.disabled"
				@click="removeRow(entry.key)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.metadata {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	gap: var(--spacing--sm);
	align-items: baseline;
	justify-content: space-between;
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.row {
	display: grid;
	grid-template-columns: minmax(140px, 220px) 1fr auto;
	gap: var(--spacing--2xs);
	align-items: start;
	min-width: 0;
}

.nameCell,
.valueCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
