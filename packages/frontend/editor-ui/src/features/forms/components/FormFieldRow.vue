<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { FormFieldDraft, FormFieldType } from '../composables/useFormFields';

const props = defineProps<{
	field: FormFieldDraft;
	selected: boolean;
	hasError?: boolean;
}>();

const emit = defineEmits<{
	select: [];
	delete: [];
}>();

const i18n = useI18n();

const FIELD_TYPE_ICONS: Record<FormFieldType, IconName> = {
	text: 'case-upper',
	email: 'at-sign',
	number: 'sliders-horizontal',
	password: 'key-round',
	date: 'circle-dot',
	textarea: 'scroll-text',
	dropdown: 'chevron-down',
	checkbox: 'square-check',
	radio: 'circle-dot',
	file: 'file-text',
	html: 'file-code',
	hiddenField: 'eye-off',
};

const label = computed(
	() => props.field.fieldLabel || i18n.baseText(`formStep.fields.type.${props.field.fieldType}`),
);

const rawOptions = computed(() => props.field.fieldOptions?.values ?? []);

const previewOptions = computed(() => {
	const named = rawOptions.value.filter((o) => o.option);
	const effective = named.length > 0 ? named : [{ option: '' }, { option: '' }];
	return effective.slice(0, 3);
});

const hiddenCount = computed(() =>
	Math.max(0, rawOptions.value.filter((o) => o.option).length - 3),
);
</script>

<template>
	<div
		:class="[$style.row, { [$style.selected]: selected, [$style.error]: hasError }]"
		@click.stop="emit('select')"
	>
		<!-- Full-height drag handle -->
		<span :class="$style.dragHandle" class="drag-handle">
			<N8nIcon icon="grip-vertical" size="xsmall" :class="$style.iconMuted" />
		</span>

		<!-- Content: header + preview -->
		<div :class="$style.content">
			<div :class="$style.header">
				<N8nIcon :icon="FIELD_TYPE_ICONS[field.fieldType]" size="large" :class="$style.typeIcon" />
				<span :class="$style.labelText">{{ label }}</span>
				<span v-if="field.requiredField" :class="$style.requiredBadge">*</span>
				<button
					:class="$style.deleteBtn"
					:title="i18n.baseText('formStep.fields.deleteField')"
					@click.stop="emit('delete')"
				>
					<N8nIcon icon="trash-2" size="small" />
				</button>
			</div>

			<!-- Single-line input (text / email / number / password / date) -->
			<div
				v-if="['text', 'email', 'number', 'password', 'date'].includes(field.fieldType)"
				:class="$style.inputPreview"
			>
				<span :class="$style.previewPlaceholder">
					{{ field.placeholder || i18n.baseText('formStep.fields.canvas.inputPlaceholder') }}
				</span>
			</div>

			<!-- Textarea -->
			<div
				v-else-if="field.fieldType === 'textarea'"
				:class="[$style.inputPreview, $style.textareaPreview]"
			>
				<span :class="$style.previewPlaceholder">
					{{ field.placeholder || i18n.baseText('formStep.fields.canvas.inputPlaceholder') }}
				</span>
			</div>

			<!-- Dropdown -->
			<div
				v-else-if="field.fieldType === 'dropdown'"
				:class="[$style.inputPreview, $style.selectPreview]"
			>
				<span :class="$style.previewPlaceholder">
					{{
						previewOptions[0]?.option || i18n.baseText('formStep.fields.canvas.selectPlaceholder')
					}}
				</span>
				<N8nIcon icon="chevron-down" size="xsmall" :class="$style.iconMuted" />
			</div>

			<!-- Checkbox -->
			<div v-else-if="field.fieldType === 'checkbox'" :class="$style.optionsPreview">
				<div v-for="(opt, idx) in previewOptions" :key="idx" :class="$style.optionItem">
					<span :class="$style.checkboxBox" />
					<span :class="$style.optionLabel">{{ opt.option || `Option ${idx + 1}` }}</span>
				</div>
				<span v-if="hiddenCount > 0" :class="$style.moreLabel">+{{ hiddenCount }} more</span>
			</div>

			<!-- Radio -->
			<div v-else-if="field.fieldType === 'radio'" :class="$style.optionsPreview">
				<div v-for="(opt, idx) in previewOptions" :key="idx" :class="$style.optionItem">
					<span :class="$style.radioCircle" />
					<span :class="$style.optionLabel">{{ opt.option || `Option ${idx + 1}` }}</span>
				</div>
				<span v-if="hiddenCount > 0" :class="$style.moreLabel">+{{ hiddenCount }} more</span>
			</div>

			<!-- File -->
			<div v-else-if="field.fieldType === 'file'" :class="$style.filePreview">
				<span>{{ i18n.baseText('formStep.fields.canvas.chooseFile') }}</span>
				<span v-if="field.acceptFileTypes" :class="$style.fileTypes">
					{{ field.acceptFileTypes }}
				</span>
			</div>

			<!-- HTML -->
			<div v-else-if="field.fieldType === 'html'" :class="$style.htmlPreview">
				<code :class="$style.htmlSnippet">{{
					field.html?.slice(0, 50) || '&lt;!-- HTML --&gt;'
				}}</code>
			</div>

			<!-- Hidden field -->
			<div v-else-if="field.fieldType === 'hiddenField'" :class="$style.hiddenPreview">
				<span>{{ field.fieldName || 'hidden_field' }}</span>
				<span v-if="field.fieldValue" :class="$style.hiddenValue">= {{ field.fieldValue }}</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	background: transparent;
	cursor: pointer;
	user-select: none;
	transition: border-color 0.15s;
	overflow: hidden;

	&:hover {
		border-color: var(--color--foreground--shade-1);

		.deleteBtn {
			opacity: 1;
		}
	}
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) 0;
}

.selected {
	border-color: var(--color--foreground--shade-1);
	background: var(--color--foreground--tint-1);
}

.error {
	border-color: var(--color--danger);

	&:hover {
		border-color: var(--color--danger--shade-1);

		.deleteBtn {
			color: var(--color--danger--shade-1);
		}
	}

	.typeIcon,
	.labelText,
	.iconMuted,
	.previewPlaceholder,
	.optionLabel,
	.moreLabel {
		color: var(--color--danger);
	}

	.deleteBtn {
		color: var(--color--danger);
	}

	.inputPreview,
	.checkboxBox,
	.radioCircle {
		border-color: var(--color--danger);
	}

	.filePreview,
	.htmlPreview,
	.hiddenPreview {
		color: var(--color--danger);
		border-color: var(--color--danger);
	}
}

.error.selected {
	border-color: var(--color--danger--shade-1);
}

/* ── Header ─────────────────────────────────────────────────────────────── */

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.dragHandle {
	flex-shrink: 0;
	cursor: grab;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing--4xs);

	&:active {
		cursor: grabbing;
	}
}

.typeIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.labelText {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.requiredBadge {
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
	line-height: 1;
}

.deleteBtn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
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
		opacity: 1;
		color: var(--color--danger);
	}
}

/* ── Input preview ───────────────────────────────────────────────────────── */

.inputPreview {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--color--foreground--shade-1);
	border-radius: var(--radius--sm);
	background: transparent;
	min-height: 26px;
	pointer-events: none;
}

.textareaPreview {
	min-height: 52px;
	align-items: flex-start;
}

.selectPreview {
	justify-content: space-between;
}

.previewPlaceholder {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* ── Checkbox / Radio ────────────────────────────────────────────────────── */

.optionsPreview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	pointer-events: none;
}

.optionItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.checkboxBox {
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	border: var(--border-width) var(--border-style) var(--color--foreground--shade-1);
	border-radius: var(--radius--sm);
}

.radioCircle {
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	border: var(--border-width) var(--border-style) var(--color--foreground--shade-1);
	border-radius: 50%;
}

.optionLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.moreLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	padding-left: calc(12px + var(--spacing--3xs));
}

/* ── File ────────────────────────────────────────────────────────────────── */

.filePreview {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border-width) dashed var(--color--foreground--shade-1);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	pointer-events: none;
}

.fileTypes {
	margin-left: auto;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

/* ── HTML ────────────────────────────────────────────────────────────────── */

.htmlPreview {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	overflow: hidden;
	pointer-events: none;
}

.htmlSnippet {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* ── Hidden field ────────────────────────────────────────────────────────── */

.hiddenPreview {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	font-style: italic;
	pointer-events: none;
}

.hiddenValue {
	font-family: monospace;
	color: var(--color--text--tint-1);
}

.iconMuted {
	color: var(--color--text--tint-2);
}
</style>
