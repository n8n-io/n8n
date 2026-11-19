<script lang="ts" setup>
import type { McpServerToolInput } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const INPUT_TYPES: Array<McpServerToolInput['type']> = [
	'string',
	'number',
	'boolean',
	'object',
	'array',
];

const props = defineProps<{
	inputs: McpServerToolInput[];
	kind: 'workflow' | 'agent';
	disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:inputs': [inputs: McpServerToolInput[]] }>();

const i18n = useI18n();

function update(index: number, patch: Partial<McpServerToolInput>) {
	emit(
		'update:inputs',
		props.inputs.map((input, i) => (i === index ? { ...input, ...patch } : input)),
	);
}

function remove(index: number) {
	emit(
		'update:inputs',
		props.inputs.filter((_, i) => i !== index),
	);
}

function add() {
	const taken = new Set(props.inputs.map((input) => input.name));
	let n = props.inputs.length + 1;
	while (taken.has(`input_${n}`)) n++;
	emit('update:inputs', [
		...props.inputs,
		{ name: `input_${n}`, type: 'string', description: '', required: false },
	]);
}

function isTypeValue(value: unknown): value is McpServerToolInput['type'] {
	return typeof value === 'string' && (INPUT_TYPES as string[]).includes(value);
}
</script>

<template>
	<div :class="$style.editor" data-testid="mcp-server-tool-inputs">
		<table v-if="inputs.length" :class="$style.table">
			<thead>
				<tr>
					<th>{{ i18n.baseText('mcpServers.tool.inputs.name') }}</th>
					<th :class="$style.typeCol">{{ i18n.baseText('mcpServers.tool.inputs.type') }}</th>
					<th>{{ i18n.baseText('mcpServers.tool.inputs.description') }}</th>
					<th :class="$style.requiredCol">
						{{ i18n.baseText('mcpServers.tool.inputs.required') }}
					</th>
					<th :class="$style.actionCol" />
				</tr>
			</thead>
			<tbody>
				<tr v-for="(input, index) in inputs" :key="index">
					<td>
						<N8nInput
							:model-value="input.name"
							size="small"
							:disabled="disabled"
							:class="$style.mono"
							data-testid="mcp-server-tool-input-name"
							@update:model-value="(value: string) => update(index, { name: value })"
						/>
					</td>
					<td>
						<N8nSelect
							:model-value="input.type"
							size="small"
							:disabled="disabled"
							data-testid="mcp-server-tool-input-type"
							@update:model-value="
								(value: unknown) => isTypeValue(value) && update(index, { type: value })
							"
						>
							<N8nOption v-for="type in INPUT_TYPES" :key="type" :value="type" :label="type" />
						</N8nSelect>
					</td>
					<td>
						<N8nInput
							:model-value="input.description ?? ''"
							size="small"
							:disabled="disabled"
							:placeholder="i18n.baseText('mcpServers.tool.inputs.descriptionPlaceholder')"
							data-testid="mcp-server-tool-input-description"
							@update:model-value="(value: string) => update(index, { description: value })"
						/>
					</td>
					<td :class="$style.requiredCol">
						<N8nCheckbox
							:model-value="input.required ?? false"
							:disabled="disabled"
							:aria-label="i18n.baseText('mcpServers.tool.inputs.required')"
							data-testid="mcp-server-tool-input-required"
							@update:model-value="(value: boolean) => update(index, { required: value })"
						/>
					</td>
					<td :class="$style.actionCol">
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="small"
							:disabled="disabled"
							:aria-label="i18n.baseText('mcpServers.tool.inputs.remove')"
							data-testid="mcp-server-tool-input-remove"
							@click="remove(index)"
						/>
					</td>
				</tr>
			</tbody>
		</table>
		<N8nText v-else size="small" color="text-light">
			{{ i18n.baseText('mcpServers.tool.inputs.none') }}
		</N8nText>
		<div :class="$style.footer">
			<N8nButton
				variant="ghost"
				size="small"
				icon="plus"
				:disabled="disabled"
				data-testid="mcp-server-tool-input-add"
				@click="add"
			>
				{{ i18n.baseText('mcpServers.tool.inputs.add') }}
			</N8nButton>
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText(
						kind === 'workflow'
							? 'mcpServers.tool.inputs.note.workflow'
							: 'mcpServers.tool.inputs.note.agent',
					)
				}}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.table {
	width: 100%;
	border-collapse: collapse;

	th {
		text-align: left;
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		color: var(--text-color--subtle);
		padding: var(--spacing--4xs) var(--spacing--4xs) var(--spacing--3xs);
	}

	td {
		padding: var(--spacing--4xs);
		vertical-align: middle;
	}
}

.typeCol {
	width: 120px;
}

.requiredCol {
	width: 72px;
	text-align: center;
}

.actionCol {
	width: 36px;
}

.mono :global(input) {
	font-family: var(--font-family--monospace);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}
</style>
