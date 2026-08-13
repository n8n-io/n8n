<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import Draggable from 'vuedraggable';
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { FormFieldType } from '../composables/useFormFields';
import { FIELD_TYPES_WITH_OPTIONS } from '../composables/useFormFields';

const emit = defineEmits<{
	add: [type: FormFieldType];
	'update:selected': [value: string];
}>();

type FieldTypeDescriptor = { type: FormFieldType; icon: IconName; labelKey: string };
type SelectableItem = { value: string; icon: IconName; labelKey: BaseTextKey };

const props = defineProps<{
	selectableItems?: SelectableItem[];
	selected?: string;
	title?: BaseTextKey;
}>();

const i18n = useI18n();

const FIELD_TYPES: FieldTypeDescriptor[] = [
	{ type: 'text', icon: 'case-upper', labelKey: 'formStep.fields.type.text' },
	{ type: 'email', icon: 'at-sign', labelKey: 'formStep.fields.type.email' },
	{ type: 'number', icon: 'sliders-horizontal', labelKey: 'formStep.fields.type.number' },
	{ type: 'password', icon: 'key-round', labelKey: 'formStep.fields.type.password' },
	{ type: 'date', icon: 'circle-dot', labelKey: 'formStep.fields.type.date' },
	{ type: 'textarea', icon: 'scroll-text', labelKey: 'formStep.fields.type.textarea' },
	{ type: 'dropdown', icon: 'chevron-down', labelKey: 'formStep.fields.type.dropdown' },
	{ type: 'checkbox', icon: 'square-check', labelKey: 'formStep.fields.type.checkbox' },
	{ type: 'radio', icon: 'circle-dot', labelKey: 'formStep.fields.type.radio' },
	{ type: 'file', icon: 'file-text', labelKey: 'formStep.fields.type.file' },
	{ type: 'html', icon: 'file-code', labelKey: 'formStep.fields.type.html' },
	{ type: 'hiddenField', icon: 'eye-off', labelKey: 'formStep.fields.type.hiddenField' },
];

const paletteTitle = computed(() => i18n.baseText(props.title ?? 'formStep.fields.palette.title'));

function cloneType(descriptor: FieldTypeDescriptor) {
	return {
		_id: crypto.randomUUID(),
		fieldType: descriptor.type,
		fieldLabel: '',
		fieldName: '',
		...(FIELD_TYPES_WITH_OPTIONS.has(descriptor.type)
			? { fieldOptions: { values: [{ option: '' }] } }
			: {}),
	};
}
</script>

<template>
	<div :class="$style.palette">
		<h4 :class="$style.title">{{ paletteTitle }}</h4>

		<!-- Selectable mode (e.g. completion types) -->
		<div v-if="selectableItems" :class="$style.list">
			<div
				v-for="item in selectableItems"
				:key="item.value"
				:class="[
					$style.card,
					$style.cardSelectable,
					{ [$style.cardSelected]: selected === item.value },
				]"
				@click="emit('update:selected', item.value)"
			>
				<N8nIcon :icon="item.icon" size="large" :class="$style.cardIcon" />
				<span :class="$style.cardLabel">{{ i18n.baseText(item.labelKey) }}</span>
			</div>
		</div>

		<!-- Draggable field type mode -->
		<Draggable
			v-else
			:list="FIELD_TYPES"
			item-key="type"
			:group="{ name: 'form-fields', pull: 'clone', put: false }"
			:sort="false"
			:clone="cloneType"
			:class="$style.list"
		>
			<template #item="{ element }">
				<div :class="$style.card" :data-testid="`field-type-${element.type}`">
					<N8nIcon :icon="element.icon" size="large" :class="$style.cardIcon" />
					<span :class="$style.cardLabel">{{ i18n.baseText(element.labelKey) }}</span>
					<button :class="$style.addBtn" @click.stop="emit('add', element.type)">
						<N8nIcon icon="plus" size="small" />
					</button>
				</div>
			</template>
		</Draggable>
	</div>
</template>

<style lang="scss" module>
.palette {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-width: 0;
	overflow: hidden;
	padding-right: var(--spacing--2xs);
}

.title {
	flex-shrink: 0;
	margin: 0 0 var(--spacing--xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.06em;
}

.list {
	flex: 1;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	min-height: calc(
		var(--spacing--3xs) * 2 + var(--spacing--xs)
	); // matches addBtn height (6+12+6=24px)
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	background: var(--color--background);
	cursor: grab;
	user-select: none;
	transition:
		border-color 0.15s,
		background 0.15s;

	&:hover {
		border-color: var(--color--primary--tint-1);
		background: var(--color--primary--tint-3);

		.addBtn {
			opacity: 1;
		}
	}

	&:active {
		cursor: grabbing;
	}
}

.cardSelectable {
	cursor: pointer;

	&:active {
		cursor: pointer;
	}
}

.cardSelected {
	border-color: var(--color--primary--tint-1);
	background: var(--color--primary--tint-3);
}

.cardIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.cardLabel {
	flex: 1;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.addBtn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	margin-left: auto;
	padding: var(--spacing--3xs);
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--primary);
	border-radius: var(--radius--sm);
	opacity: 0;
	transition: opacity 0.15s;

	&:hover {
		background: var(--color--primary--tint-2);
	}
}
</style>
