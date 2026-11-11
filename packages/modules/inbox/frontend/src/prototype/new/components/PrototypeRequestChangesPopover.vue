<script setup lang="ts">
import { WORKFLOW_REVIEW_TEXT_MAX_LENGTH } from '@n8n/api-types';
import { N8nButton, N8nInput, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useId, watch } from 'vue';

const props = defineProps<{
	open: boolean;
	/** The element that the popover opens on. */
	reference?: HTMLElement;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	submit: [note: string];
}>();

const i18n = useI18n();
const noteId = useId();
const note = ref('');
const noteReady = computed(() => note.value.trim().length > 0);

// A closed popover keeps no note.
watch(
	() => props.open,
	(open) => {
		if (!open) note.value = '';
	},
);

// The hidden trigger can send an open event. Only close is real.
function onOpenChange(open: boolean) {
	if (!open) emit('update:open', false);
}

function submit() {
	const value = note.value.trim();
	if (!value || props.disabled) return;
	emit('submit', value);
}
</script>

<template>
	<!-- The note sits where the menu sat. The hidden trigger only satisfies the popover. -->
	<N8nPopover
		:open="open"
		side="bottom"
		align="end"
		width="28rem"
		:enable-scrolling="false"
		:reference="reference"
		:content-class="$style.popover"
		@update:open="onOpenChange"
	>
		<template #trigger>
			<span :class="$style.trigger" aria-hidden="true" />
		</template>
		<template #content>
			<div :class="$style.form" data-test-id="workflow-review-request-changes-form">
				<N8nText tag="label" bold size="medium" :for="noteId">
					{{ i18n.baseText('workflowReviews.detail.decision.note.required') }}
				</N8nText>
				<N8nInput
					:id="noteId"
					v-model="note"
					type="textarea"
					:rows="6"
					autofocus
					:maxlength="WORKFLOW_REVIEW_TEXT_MAX_LENGTH"
					data-test-id="workflow-review-request-changes-note"
				/>
				<div :class="$style.actions">
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('generic.cancel')"
						:disabled="disabled"
						data-test-id="workflow-review-request-changes-cancel"
						@click="emit('update:open', false)"
					/>
					<N8nButton
						size="small"
						:disabled="!noteReady || disabled"
						:label="i18n.baseText('workflowReviews.detail.decision.requestChanges')"
						data-test-id="workflow-review-request-changes-submit"
						@click="submit"
					/>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
/* The popover positions on the Review button. This trigger stays out of the layout. */
.trigger {
	position: absolute;
	width: 0;
	height: 0;
	padding: 0;
	overflow: hidden;
	pointer-events: none;
}

.popover {
	padding: var(--spacing--xs);
	/* A narrow window keeps the popover inside the page. */
	max-width: calc(100vw - 2 * var(--spacing--md));
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
