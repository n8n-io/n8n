<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import Draggable from 'vuedraggable';
import FormFieldRow from './FormFieldRow.vue';
import type { FormFieldDraft } from '../composables/useFormFields';

const props = defineProps<{
	fields: FormFieldDraft[];
	selectedFieldId: string | null;
	fieldErrors: Record<string, string[]>;
	formTitle: string;
	formDescription: string;
	submitLabel: string;
	inheritedTitle?: string;
	inheritedDescription?: string;
	inheritedSubmitLabel?: string;
}>();

const emit = defineEmits<{
	'update:fields': [fields: FormFieldDraft[]];
	'update:formTitle': [value: string];
	'update:formDescription': [value: string];
	'update:submitLabel': [value: string];
	selectField: [id: string | null];
	selectFormElement: [el: 'title' | 'description' | 'submit'];
	deleteField: [id: string];
}>();

const i18n = useI18n();

const localFields = computed({
	get: () => props.fields,
	set: (v) => emit('update:fields', v),
});

const isEmpty = computed(() => props.fields.length === 0);
</script>

<template>
	<div :class="$style.canvas" @click="emit('selectField', null)">
		<div :class="$style.card">
			<input
				:value="formTitle"
				:placeholder="inheritedTitle || i18n.baseText('formStep.fields.canvas.titlePlaceholder')"
				:class="$style.titleInput"
				autocomplete="off"
				@input="emit('update:formTitle', ($event.target as HTMLInputElement).value)"
				@click.stop
				@focus="emit('selectFormElement', 'title')"
			/>

			<textarea
				:value="formDescription"
				:placeholder="
					inheritedDescription || i18n.baseText('formStep.fields.canvas.descriptionPlaceholder')
				"
				:class="$style.descriptionInput"
				rows="2"
				@input="emit('update:formDescription', ($event.target as HTMLTextAreaElement).value)"
				@click.stop
				@focus="emit('selectFormElement', 'description')"
			/>

			<!-- Fields list -->
			<Draggable
				v-model="localFields"
				item-key="_id"
				:group="{ name: 'form-fields', pull: true, put: true }"
				handle=".drag-handle"
				:class="[$style.fieldList, { [$style.empty]: isEmpty }]"
				ghost-class="drag-ghost"
				@click.stop
			>
				<template #item="{ element }">
					<FormFieldRow
						:field="element"
						:selected="selectedFieldId === element._id"
						:has-error="(fieldErrors[element._id]?.length ?? 0) > 0"
						@select="emit('selectField', element._id)"
						@delete="emit('deleteField', element._id)"
					/>
				</template>
				<template #footer>
					<div v-if="isEmpty" :class="$style.emptyState">
						{{ i18n.baseText('formStep.fields.canvas.emptyState') }}
					</div>
				</template>
			</Draggable>

			<!-- Submit button -->
			<div :class="$style.submitRow" @click.stop>
				<div
					:class="$style.submitInput"
					contenteditable="true"
					:data-placeholder="
						inheritedSubmitLabel || i18n.baseText('formStep.fields.canvas.submitPlaceholder')
					"
					@input="emit('update:submitLabel', ($event.target as HTMLElement).textContent ?? '')"
					@focus="emit('selectFormElement', 'submit')"
					@keydown.enter.prevent
				>
					{{ submitLabel }}
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvas {
	height: 100%;
	overflow-y: auto;
	padding: 0 var(--spacing--sm);
}

.card {
	background: var(--color--background--light-2);
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	overflow: hidden;
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 100%;
	max-width: 480px;
	margin: 0 auto;
	width: 100%;
}

.titleInput {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	line-height: var(--line-height--md);
	border: none;
	outline: none;
	background: transparent;
	width: 100%;
	padding: 0;
	font-family: var(--font-family);
	text-align: center;

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.descriptionInput {
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	color: var(--color--text--tint-1);
	border: none;
	outline: none;
	background: transparent;
	width: 100%;
	padding: 0;
	resize: none;
	line-height: var(--line-height--xl);
	text-align: center;

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.fieldList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-height: 48px;
	flex: 1;
}

.empty {
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius);
}

.emptyState {
	padding: var(--spacing--md);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}

.submitRow {
	margin-top: var(--spacing--xs);
}

.submitInput {
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--text);
	color: var(--color--background);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family);
	border-radius: var(--radius);
	text-align: center;
	cursor: text;
	outline: none;
	min-height: 1em;
	box-sizing: border-box;

	&:empty::before {
		content: attr(data-placeholder);
		opacity: 0.7;
	}
}
</style>

<style>
.drag-ghost {
	opacity: 0.4;
}
</style>
