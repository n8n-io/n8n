<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { FormFieldDraft, FormFieldType } from '../composables/useFormFields';

const props = defineProps<{
	field: FormFieldDraft;
	selected: boolean;
}>();

const emit = defineEmits<{
	select: [];
	delete: [];
}>();

const i18n = useI18n();

const FIELD_TYPE_ICONS: Record<FormFieldType, string> = {
	text: 'string',
	email: 'at-sign',
	number: 'sliders-h',
	password: 'key-round',
	date: 'circle-dot',
	textarea: 'scroll-text',
	dropdown: 'chevron-down',
	checkbox: 'check-square',
	radio: 'dot-circle',
	file: 'file-alt',
	html: 'file-code',
	hiddenField: 'eye-slash',
};

const icon = computed(() => FIELD_TYPE_ICONS[props.field.fieldType] ?? 'string');
const label = computed(
	() => props.field.fieldLabel || i18n.baseText(`formStep.fields.type.${props.field.fieldType}`),
);
</script>

<template>
	<div :class="[$style.row, { [$style.selected]: selected }]" @click.stop="emit('select')">
		<span :class="$style.dragHandle" class="drag-handle">
			<N8nIcon icon="grip-vertical" size="small" color="var(--color--text--tint-2)" />
		</span>
		<span :class="$style.typeIcon">
			<N8nIcon :icon="icon" size="small" color="var(--color--text--tint-1)" />
		</span>
		<span :class="$style.label">{{ label }}</span>
		<button
			:class="$style.deleteBtn"
			:title="i18n.baseText('formStep.fields.deleteField')"
			@click.stop="emit('delete')"
		>
			<N8nIcon icon="trash-2" size="xsmall" />
		</button>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	background: var(--color--background);
	cursor: pointer;
	user-select: none;
	transition: border-color 0.15s;

	&:hover {
		border-color: var(--color--foreground);

		.deleteBtn {
			opacity: 1;
		}
	}
}

.selected {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}

.dragHandle {
	flex-shrink: 0;
	cursor: grab;
	display: flex;
	align-items: center;

	&:active {
		cursor: grabbing;
	}
}

.typeIcon {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.label {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.deleteBtn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--5xs);
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-2);
	border-radius: var(--radius--sm);
	opacity: 0;
	transition:
		opacity 0.15s,
		color 0.15s;

	&:hover {
		color: var(--color--danger);
	}
}
</style>
