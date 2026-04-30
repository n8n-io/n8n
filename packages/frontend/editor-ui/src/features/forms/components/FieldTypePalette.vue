<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import Draggable from 'vuedraggable';
import { N8nIcon } from '@n8n/design-system';
import type { FormFieldType } from '../composables/useFormFields';
import { FIELD_TYPES_WITH_OPTIONS } from '../composables/useFormFields';

const emit = defineEmits<{
	add: [type: FormFieldType];
}>();

const i18n = useI18n();

type FieldTypeDescriptor = { type: FormFieldType; icon: string; labelKey: string };

const FIELD_TYPES: FieldTypeDescriptor[] = [
	{ type: 'text', icon: 'string', labelKey: 'formStep.fields.type.text' },
	{ type: 'email', icon: 'at-sign', labelKey: 'formStep.fields.type.email' },
	{ type: 'number', icon: 'sliders-h', labelKey: 'formStep.fields.type.number' },
	{ type: 'password', icon: 'key-round', labelKey: 'formStep.fields.type.password' },
	{ type: 'date', icon: 'circle-dot', labelKey: 'formStep.fields.type.date' },
	{ type: 'textarea', icon: 'scroll-text', labelKey: 'formStep.fields.type.textarea' },
	{ type: 'dropdown', icon: 'chevron-down', labelKey: 'formStep.fields.type.dropdown' },
	{ type: 'checkbox', icon: 'check-square', labelKey: 'formStep.fields.type.checkbox' },
	{ type: 'radio', icon: 'dot-circle', labelKey: 'formStep.fields.type.radio' },
	{ type: 'file', icon: 'file-alt', labelKey: 'formStep.fields.type.file' },
	{ type: 'html', icon: 'file-code', labelKey: 'formStep.fields.type.html' },
	{ type: 'hiddenField', icon: 'eye-slash', labelKey: 'formStep.fields.type.hiddenField' },
];

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
		<h4 :class="$style.title">{{ i18n.baseText('formStep.fields.palette.title') }}</h4>
		<Draggable
			:list="FIELD_TYPES"
			item-key="type"
			:group="{ name: 'form-fields', pull: 'clone', put: false }"
			:sort="false"
			:clone="cloneType"
			:class="$style.list"
		>
			<template #item="{ element }">
				<div
					:class="$style.card"
					:data-testid="`field-type-${element.type}`"
					@click="emit('add', element.type)"
				>
					<N8nIcon :icon="element.icon" size="small" :class="$style.cardIcon" />
					<span :class="$style.cardLabel">{{ i18n.baseText(element.labelKey) }}</span>
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
	overflow: hidden;
}

.title {
	flex-shrink: 0;
	margin: 0 0 var(--spacing--xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.08em;
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
	padding: var(--spacing--3xs) var(--spacing--2xs);
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
	}

	&:active {
		cursor: grabbing;
	}
}

.cardIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.cardLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}
</style>
