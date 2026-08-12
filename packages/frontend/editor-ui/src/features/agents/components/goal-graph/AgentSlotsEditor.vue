<script setup lang="ts">
import type { AgentSlotConfig } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { createDefaultSlot } from './goalGraphEdit';

const SLOT_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_]*$/;
const SLOT_NAME_MAX_LENGTH = 64;
const SLOT_TYPES: Array<AgentSlotConfig['type']> = ['string', 'number', 'boolean', 'object'];

const props = withDefaults(defineProps<{ slots: AgentSlotConfig[]; disabled?: boolean }>(), {
	disabled: false,
});

const emit = defineEmits<{ 'update:slots': [AgentSlotConfig[]] }>();

const i18n = useI18n();

const accessOptions = computed(() => [
	{
		value: 'standard' as const,
		label: i18n.baseText('agents.builder.goals.slots.access.standard'),
	},
	{
		value: 'protected' as const,
		label: i18n.baseText('agents.builder.goals.slots.access.protected'),
	},
	{ value: 'private' as const, label: i18n.baseText('agents.builder.goals.slots.access.private') },
]);

interface SlotRow {
	name: string;
	displayName: string;
	type: AgentSlotConfig['type'];
	access: AgentSlotConfig['access'];
	description: string;
	initialValueText: string;
}

function toRow(slot: AgentSlotConfig): SlotRow {
	return {
		name: slot.name,
		displayName: slot.displayName ?? '',
		type: slot.type,
		access: slot.access,
		description: slot.description ?? '',
		initialValueText:
			slot.initialValue === undefined
				? ''
				: typeof slot.initialValue === 'string'
					? slot.initialValue
					: JSON.stringify(slot.initialValue),
	};
}

// Rows are edited locally and only emitted upward while every name is valid,
// so a half-typed name never reaches the debounced autosave.
const rows = ref<SlotRow[]>(props.slots.map(toRow));

watch(
	() => props.slots,
	(next) => {
		const nextRows = next.map(toRow);
		if (JSON.stringify(nextRows) !== JSON.stringify(rows.value)) rows.value = nextRows;
	},
	{ deep: true },
);

const nameErrors = computed(() =>
	rows.value.map((row, index) => {
		if (!SLOT_NAME_REGEX.test(row.name) || row.name.length > SLOT_NAME_MAX_LENGTH) {
			return i18n.baseText('agents.builder.goals.slots.nameInvalid');
		}
		if (rows.value.some((other, j) => j !== index && other.name === row.name)) {
			return i18n.baseText('agents.builder.goals.slots.nameDuplicate');
		}
		return '';
	}),
);

const allNamesValid = computed(() => nameErrors.value.every((error) => error === ''));

function parseInitialValue(text: string): unknown {
	const trimmed = text.trim();
	if (trimmed === '') return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		return text;
	}
}

function buildSlots(): AgentSlotConfig[] {
	return rows.value.map((row) => {
		const displayName = row.displayName.trim();
		const description = row.description.trim();
		const initialValue = parseInitialValue(row.initialValueText);
		return {
			name: row.name,
			...(displayName ? { displayName } : {}),
			type: row.type,
			access: row.access,
			...(description ? { description } : {}),
			...(initialValue !== undefined ? { initialValue } : {}),
		};
	});
}

function emitIfValid() {
	if (allNamesValid.value) emit('update:slots', buildSlots());
}

function updateRow(index: number, patch: Partial<SlotRow>) {
	rows.value = rows.value.map((row, i) => (i === index ? { ...row, ...patch } : row));
	emitIfValid();
}

function addSlot() {
	rows.value = [...rows.value, toRow(createDefaultSlot(buildSlots()))];
	emitIfValid();
}

function removeSlot(index: number) {
	rows.value = rows.value.filter((_, i) => i !== index);
	emitIfValid();
}
</script>

<template>
	<div :class="$style.container" data-testid="agent-slots-editor">
		<div :class="$style.header">
			<N8nText size="small" :bold="true">
				{{ i18n.baseText('agents.builder.goals.slots.label') }}
			</N8nText>
			<N8nButton
				variant="subtle"
				size="small"
				:disabled="props.disabled"
				data-testid="agent-slots-add"
				@click="addSlot"
			>
				<template #icon><N8nIcon icon="plus" :size="16" /></template>
				{{ i18n.baseText('agents.builder.goals.slots.add') }}
			</N8nButton>
		</div>
		<div v-if="rows.length > 0" :class="[$style.grid, $style.gridHeader]">
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.builder.goals.slots.name') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.builder.goals.slots.displayName') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.builder.goals.slots.type') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.builder.goals.slots.access') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.builder.goals.slots.description') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.builder.goals.slots.initialValue') }}
			</N8nText>
			<span />
		</div>
		<div v-for="(row, index) in rows" :key="index" :class="$style.rowWrap">
			<div :class="$style.grid">
				<N8nInput
					:model-value="row.name"
					size="small"
					:class="$style.mono"
					:disabled="props.disabled"
					data-testid="agent-slot-name"
					@update:model-value="updateRow(index, { name: String($event) })"
				/>
				<N8nInput
					:model-value="row.displayName"
					size="small"
					:disabled="props.disabled"
					data-testid="agent-slot-display-name"
					@update:model-value="updateRow(index, { displayName: String($event) })"
				/>
				<N8nSelect
					:model-value="row.type"
					size="small"
					:teleported="false"
					:disabled="props.disabled"
					data-testid="agent-slot-type"
					@update:model-value="updateRow(index, { type: $event })"
				>
					<N8nOption v-for="type in SLOT_TYPES" :key="type" :value="type" :label="type" />
				</N8nSelect>
				<N8nSelect
					:model-value="row.access"
					size="small"
					:teleported="false"
					:disabled="props.disabled"
					data-testid="agent-slot-access"
					@update:model-value="updateRow(index, { access: $event })"
				>
					<N8nOption
						v-for="option in accessOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nInput
					:model-value="row.description"
					size="small"
					:disabled="props.disabled"
					data-testid="agent-slot-description"
					@update:model-value="updateRow(index, { description: String($event) })"
				/>
				<N8nInput
					:model-value="row.initialValueText"
					size="small"
					:class="$style.mono"
					:disabled="props.disabled"
					data-testid="agent-slot-initial-value"
					@update:model-value="updateRow(index, { initialValueText: String($event) })"
				/>
				<N8nButton
					variant="ghost"
					size="small"
					icon-only
					:disabled="props.disabled"
					:aria-label="i18n.baseText('agents.builder.goals.slots.remove')"
					data-testid="agent-slot-remove"
					@click="removeSlot(index)"
				>
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				</N8nButton>
			</div>
			<N8nText v-if="nameErrors[index]" :class="$style.error" size="small">
				{{ nameErrors[index] }}
			</N8nText>
		</div>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.grid {
	display: grid;
	grid-template-columns: 1fr 1fr 90px 110px 1.3fr 1fr 30px;
	gap: var(--spacing--2xs);
	align-items: center;
}

.gridHeader {
	padding: 0 var(--spacing--4xs);
}

.rowWrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.mono :global(input) {
	font-family: var(--font-family--monospace, monospace);
	font-size: var(--font-size--2xs);
}

.error {
	color: var(--color--danger);
}
</style>
