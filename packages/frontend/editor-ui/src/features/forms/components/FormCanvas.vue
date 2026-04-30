<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import Draggable from 'vuedraggable';
import FormFieldRow from './FormFieldRow.vue';
import type { FormFieldDraft } from '../composables/useFormFields';

const props = defineProps<{
	fields: FormFieldDraft[];
	selectedFieldId: string | null;
	formTitle: string;
	formDescription: string;
	submitLabel: string;
	isTrigger: boolean;
}>();

const emit = defineEmits<{
	'update:fields': [fields: FormFieldDraft[]];
	'update:formTitle': [value: string];
	'update:formDescription': [value: string];
	'update:submitLabel': [value: string];
	selectField: [id: string | null];
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
			<!-- Title (only editable on trigger; other nodes inherit from trigger) -->
			<input
				v-if="isTrigger"
				:value="formTitle"
				:placeholder="i18n.baseText('formStep.fields.canvas.titlePlaceholder')"
				:class="$style.titleInput"
				@input="emit('update:formTitle', ($event.target as HTMLInputElement).value)"
				@click.stop
			/>
			<p v-else-if="formTitle" :class="$style.titleStatic">{{ formTitle }}</p>

			<textarea
				v-if="isTrigger"
				:value="formDescription"
				:placeholder="i18n.baseText('formStep.fields.canvas.descriptionPlaceholder')"
				:class="$style.descriptionInput"
				rows="2"
				@input="emit('update:formDescription', ($event.target as HTMLTextAreaElement).value)"
				@click.stop
			/>
			<p v-else-if="formDescription" :class="$style.descriptionStatic">
				{{ formDescription }}
			</p>

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
				<input
					:value="submitLabel"
					:placeholder="i18n.baseText('formStep.fields.canvas.submitPlaceholder')"
					:class="$style.submitInput"
					@input="emit('update:submitLabel', ($event.target as HTMLInputElement).value)"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvas {
	height: 100%;
	overflow-y: auto;
	padding: var(--spacing--sm);
	background: var(--color--background--shade-1);
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
}

.card {
	background: var(--color--background);
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 100%;
}

.titleInput,
.titleStatic {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
}

.titleInput {
	border: none;
	outline: none;
	background: transparent;
	width: 100%;
	padding: 0;
	font-family: var(--font-family);

	&:focus {
		outline: none;
	}

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.titleStatic {
	margin: 0;
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

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.descriptionStatic {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	margin: 0;
}

.fieldList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-height: 48px;
	flex: 1;
}

.empty {
	border: var(--border-width) dashed var(--color--foreground--tint-1);
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
	background: var(--color--primary);
	color: white;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family);
	border: none;
	border-radius: var(--radius);
	text-align: center;
	cursor: text;

	&::placeholder {
		color: white;
		opacity: 0.7;
	}
}
</style>

<style>
.drag-ghost {
	opacity: 0.4;
}
</style>
