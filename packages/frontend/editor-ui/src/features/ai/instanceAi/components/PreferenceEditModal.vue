<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH, aiPreferenceContentSchema } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nFormInput,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Rule, RuleGroup } from '@/Interface';

import { editPreferenceCard, undoPreferenceCard } from '../instanceAi.api';
import { useThread } from '../instanceAi.store';
import { isPreferenceCardEvent } from '../preferenceCard.utils';

type FailureKey =
	| 'instanceAi.preferenceCard.modal.saveFailed'
	| 'instanceAi.preferenceCard.modal.removeFailed';

const open = defineModel<boolean>('open', { required: true });

const props = defineProps<{
	preferenceId: string;
	/** The text the row currently holds. Save stays off until the draft differs from it. */
	content: string;
	runId: string;
	toolCallId: string;
}>();

const i18n = useI18n();
const { restApiContext } = useRootStore();
const thread = useThread();
const telemetry = useTelemetry();

/** The only scope this ticket writes. CONTEXT-141 adds the others and enables the select. */
const USER_SCOPE_VALUE = 'user';

const draft = ref(props.content);
const busy = ref(false);
const errorMessage = ref('');

// Each opening starts from what is stored, so a cancelled edit leaves nothing behind.
watch(open, (isOpen) => {
	if (!isOpen) return;
	draft.value = props.content;
	errorMessage.value = '';
});

// The same rules, counter, and cap as the preference modal on the settings page.
const contentValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: AI_PREFERENCE_CONTENT_MAX_LENGTH } },
];

const validation = computed(() => aiPreferenceContentSchema.safeParse(draft.value));

// Nothing to accept when the text is unchanged: the preference is already saved.
const isDirty = computed(() => draft.value.trim() !== props.content);
const canSave = computed(() => isDirty.value && validation.value.success && !busy.value);

async function save() {
	if (!canSave.value || !validation.value.success) return;
	busy.value = true;
	errorMessage.value = '';
	try {
		const response = await editPreferenceCard(restApiContext, thread.id, props.preferenceId, {
			runId: props.runId,
			toolCallId: props.toolCallId,
			content: validation.value.data,
		});
		if (!applyReturnedFact(response, 'instanceAi.preferenceCard.modal.saveFailed')) return;
		open.value = false;
	} catch (error) {
		// The refusal belongs next to the text that caused it, so the modal stays open.
		errorMessage.value = messageOf(error, 'instanceAi.preferenceCard.modal.saveFailed');
	} finally {
		busy.value = false;
	}
}

async function remove() {
	if (busy.value) return;
	busy.value = true;
	errorMessage.value = '';
	try {
		// Opening this modal is the deliberate step, so nothing asks again here.
		const response = await undoPreferenceCard(restApiContext, thread.id, props.preferenceId, {
			runId: props.runId,
			toolCallId: props.toolCallId,
		});
		if (!applyReturnedFact(response, 'instanceAi.preferenceCard.modal.removeFailed')) return;
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
			count: 1,
			source: 'rejected',
			scope_types: ['user'],
		});
		open.value = false;
	} catch (error) {
		errorMessage.value = messageOf(error, 'instanceAi.preferenceCard.modal.removeFailed');
	} finally {
		busy.value = false;
	}
}

/**
 * Moves the card with the fact the endpoint returned. The stream delivers the same
 * fact and sets the same fields. A body without that fact leaves the row state
 * unknown, so nothing is applied and the modal stays open with the failure line.
 */
function applyReturnedFact(response: unknown, failureKey: FailureKey): boolean {
	const event =
		typeof response === 'object' && response !== null && 'event' in response
			? response.event
			: undefined;
	if (!isPreferenceCardEvent(event)) {
		errorMessage.value = i18n.baseText(failureKey);
		return false;
	}
	thread.applyEvent(event);
	return true;
}

/** A close while a request is in flight would hide the refusal it may still return. */
function onOpenChange(value: boolean) {
	if (busy.value) return;
	open.value = value;
}

/** The server explains a refusal better than a generic line, so prefer its message. */
function messageOf(error: unknown, fallbackKey: FailureKey): string {
	if (error instanceof Error && error.message) return error.message;
	return i18n.baseText(fallbackKey);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('instanceAi.preferenceCard.modal.title')"
		:description="i18n.baseText('instanceAi.preferenceCard.modal.subtitle')"
		data-test-id="instance-ai-preference-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.form">
			<N8nFormInput
				v-model="draft"
				name="content"
				type="textarea"
				focus-initially
				required
				:label="i18n.baseText('instanceAi.preferenceCard.modal.textLabel')"
				:autosize="{ minRows: 3, maxRows: 8 }"
				:maxlength="AI_PREFERENCE_CONTENT_MAX_LENGTH"
				:validate-on-blur="false"
				:validation-rules="contentValidationRules"
				:disabled="busy"
				data-test-id="instance-ai-preference-modal-text"
			/>
			<N8nText
				:class="$style.counter"
				size="small"
				color="text-light"
				data-test-id="instance-ai-preference-modal-counter"
			>
				{{ draft.length }} / {{ AI_PREFERENCE_CONTENT_MAX_LENGTH }}
			</N8nText>

			<N8nInputLabel
				:label="i18n.baseText('instanceAi.preferenceCard.modal.scopeLabel')"
				color="text-dark"
			>
				<N8nSelect
					:model-value="USER_SCOPE_VALUE"
					size="large"
					disabled
					:teleported="false"
					data-test-id="instance-ai-preference-modal-scope"
				>
					<template #prefix>
						<N8nIcon icon="user" />
					</template>
					<N8nOption
						:value="USER_SCOPE_VALUE"
						:label="i18n.baseText('settings.context.preferences.scope.user')"
					/>
				</N8nSelect>
			</N8nInputLabel>

			<N8nCallout
				v-if="errorMessage"
				theme="danger"
				data-test-id="instance-ai-preference-modal-error"
			>
				{{ errorMessage }}
			</N8nCallout>
		</div>

		<N8nDialogFooter>
			<N8nButton
				:class="$style.remove"
				variant="ghost"
				:disabled="busy"
				data-test-id="instance-ai-preference-modal-remove"
				@click="remove"
			>
				{{ i18n.baseText('instanceAi.preferenceCard.modal.remove') }}
			</N8nButton>
			<N8nButton variant="subtle" :disabled="busy" @click="open = false">
				{{ i18n.baseText('instanceAi.preferenceCard.modal.cancel') }}
			</N8nButton>
			<N8nButton
				:disabled="!canSave"
				:loading="busy"
				data-test-id="instance-ai-preference-modal-save"
				@click="save"
			>
				{{ i18n.baseText('instanceAi.preferenceCard.modal.save') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
	border-bottom: var(--border-width) dashed var(--color--foreground);
	margin-bottom: var(--spacing--sm);
}

.counter {
	align-self: flex-end;
	margin-top: calc(-1 * var(--spacing--xs));
}

/* Removal is the one destructive action here, so it sits apart from Cancel and Save. */
.remove {
	--button--color: var(--color--text--danger);
	--button--color--hover: var(--color--text--danger);
	--button--color--active: var(--color--text--danger);

	margin-right: auto;
}
</style>
