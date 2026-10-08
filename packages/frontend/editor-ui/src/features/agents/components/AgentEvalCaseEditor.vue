<script setup lang="ts">
/**
 * One case in edit mode, in place of the row it replaces.
 *
 * Values are seeded into local state rather than bound to the props, so
 * cancelling genuinely discards and a concurrent refresh can't rewrite what
 * someone is halfway through typing. Removal lives here because the design gives
 * a row no delete affordance of its own.
 */
import { N8nButton, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
	input: string;
	whatToCheck: string;
	/** False for a draft that was never persisted — there is nothing to remove. */
	removable?: boolean;
	/** True when the dataset maps no check column, so only the request is editable. */
	requestOnly?: boolean;
	saving?: boolean;
	removing?: boolean;
}>();

const emit = defineEmits<{
	save: [value: { input: string; whatToCheck: string }];
	cancel: [];
	remove: [];
}>();

const i18n = useI18n();

const input = ref(props.input);
const whatToCheck = ref(props.whatToCheck);

// Re-seed if the row being edited changes underneath us (a reorder, a refresh).
watch(
	() => [props.input, props.whatToCheck],
	([nextInput, nextCheck]) => {
		input.value = nextInput;
		whatToCheck.value = nextCheck;
	},
);

const busy = computed(() => Boolean(props.saving) || Boolean(props.removing));

// A blank request tests nothing, and a blank check reads as a missing note rather
// than an intentional one — so both are required unless the dataset has no check
// column at all.
const canSave = computed(
	() =>
		!busy.value &&
		input.value.trim().length > 0 &&
		(props.requestOnly || whatToCheck.value.trim().length > 0),
);

function onSave() {
	if (!canSave.value) return;

	emit('save', {
		input: input.value.trim(),
		whatToCheck: props.requestOnly ? '' : whatToCheck.value.trim(),
	});
}

// Escape has to respect the same guard as the Cancel button: closing the editor
// mid-save would hide a write that is still in flight.
function onCancel() {
	if (busy.value) return;

	emit('cancel');
}
</script>

<template>
	<div :class="$style.editor" data-testid="agent-evals-case-editor" @keydown.esc.stop="onCancel">
		<N8nInputLabel
			:label="i18n.baseText('agents.builder.agentEvals.case.request.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				v-model="input"
				type="textarea"
				:autosize="{ minRows: 1, maxRows: 6 }"
				:disabled="busy"
				:placeholder="i18n.baseText('agents.builder.agentEvals.case.request.placeholder')"
				data-testid="agent-evals-case-input"
				@keydown.meta.enter="onSave"
				@keydown.ctrl.enter="onSave"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			v-if="!requestOnly"
			:label="i18n.baseText('agents.builder.agentEvals.case.whatToCheck.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				v-model="whatToCheck"
				type="textarea"
				:autosize="{ minRows: 1, maxRows: 6 }"
				:disabled="busy"
				:placeholder="i18n.baseText('agents.builder.agentEvals.case.whatToCheck.placeholder')"
				data-testid="agent-evals-case-check"
				@keydown.meta.enter="onSave"
				@keydown.ctrl.enter="onSave"
			/>
		</N8nInputLabel>

		<div :class="$style.actions">
			<N8nButton
				v-if="removable"
				variant="destructive"
				size="small"
				type="button"
				:loading="removing"
				:disabled="busy"
				data-testid="agent-evals-case-remove"
				@click="emit('remove')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.case.remove') }}
			</N8nButton>

			<div :class="$style.spacer" />

			<N8nButton
				variant="subtle"
				size="small"
				type="button"
				:disabled="busy"
				data-testid="agent-evals-case-cancel"
				@click="onCancel"
			>
				{{ i18n.baseText('agents.builder.agentEvals.case.cancel') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				size="small"
				type="button"
				:loading="saving"
				:disabled="!canSave"
				data-testid="agent-evals-case-save"
				@click="onSave"
			>
				{{ i18n.baseText('agents.builder.agentEvals.case.save') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background-color: var(--background--light-2);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spacer {
	flex: 1;
}
</style>
