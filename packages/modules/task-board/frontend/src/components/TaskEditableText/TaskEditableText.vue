<script setup lang="ts">
import { N8nButton, N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useInlineEdit } from '../../composables/useInlineEdit';

/**
 * Shows a text in the default slot, and lets the user edit it in place. One line saves on
 * Enter and on blur. Many lines save with the button, or with Ctrl+Enter.
 */
const props = defineProps<{
	value: string;
	editable: boolean;
	/** The accessible name of the edit button. */
	editLabel: string;
	multiline?: boolean;
	required?: boolean;
	maxlength?: number;
	placeholder?: string;
	testId: string;
}>();
const emit = defineEmits<{ save: [value: string] }>();
const i18n = useI18n();

const { editing, draft, start, cancel, save } = useInlineEdit({
	value: () => props.value,
	required: props.required,
	onSave: (value) => emit('save', value),
});

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		// Escape ends the edit. It must not also close the panel or the dialog around it.
		event.stopPropagation();
		cancel();
		return;
	}
	if (event.key !== 'Enter') return;
	if (props.multiline && !(event.metaKey || event.ctrlKey)) return;
	event.preventDefault();
	save();
}

function onBlur() {
	if (!props.multiline) save();
}
</script>

<template>
	<div v-if="editing" :class="$style.editor">
		<N8nInput
			v-model="draft"
			:type="multiline ? 'textarea' : 'text'"
			:autosize="multiline ? { minRows: 4, maxRows: 16 } : false"
			:maxlength="maxlength"
			:placeholder="placeholder"
			:aria-label="editLabel"
			autofocus
			:data-test-id="`${testId}-input`"
			@keydown="onKeydown"
			@blur="onBlur"
		/>
		<div v-if="multiline" :class="$style.actions">
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('generic.cancel')"
				:data-test-id="`${testId}-cancel`"
				@click="cancel"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="i18n.baseText('generic.save')"
				:data-test-id="`${testId}-save`"
				@click="save"
			/>
		</div>
	</div>
	<div v-else :class="$style.display">
		<div :class="$style.content"><slot /></div>
		<N8nButton
			v-if="editable"
			variant="ghost"
			size="small"
			icon="pencil"
			icon-only
			:class="$style.edit"
			:aria-label="editLabel"
			:data-test-id="`${testId}-edit`"
			@click="start"
		/>
	</div>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.display {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.content {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}

.edit {
	flex-shrink: 0;
}
</style>
