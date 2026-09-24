<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AiPreferenceScope } from '@n8n/api-types';
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
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { Rule, RuleGroup } from '@/Interface';

import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useContextStore } from '@/features/settings/context/context.store';
import {
	canWriteInstanceScope,
	canWriteProjectScope,
} from '@/features/settings/context/context.utils';

import { editPreferenceCard, undoPreferenceCard } from '../instanceAi.api';
import { useThread } from '../instanceAi.store';
import { isPreferenceCardEvent } from '../preferenceCard.utils';
import { preferenceScopeLabel } from '../preferenceScope.utils';

type FailureKey =
	| 'instanceAi.preferenceCard.modal.saveFailed'
	| 'instanceAi.preferenceCard.modal.removeFailed';

const open = defineModel<boolean>('open', { required: true });

const props = defineProps<{
	preferenceId: string;
	/** The text the row currently holds. Save stays off until the draft differs from it. */
	content: string;
	/** Where the row is now. The select opens on it and always lists it. */
	scope: AiPreferenceScope;
	projectId: string | null;
	/** The owner of a user-scoped row. An edit must name it, so it travels with the request. */
	userId: string | null;
	runId: string;
	toolCallId: string;
}>();

const i18n = useI18n();
const { restApiContext } = useRootStore();
const thread = useThread();

const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const contextStore = useContextStore();

/** Select values, in the shape the settings modal uses: `user`, `instance`, `project:<id>`. */
const USER_SCOPE_VALUE = 'user';
const INSTANCE_SCOPE_VALUE = 'instance';
const PROJECT_SCOPE_PREFIX = 'project:';
const projectScopeValue = (id: string) => `${PROJECT_SCOPE_PREFIX}${id}`;

function scopeValueOf(scope: AiPreferenceScope, projectId: string | null): string {
	if (scope === 'instance') return INSTANCE_SCOPE_VALUE;
	if (scope === 'project' && projectId) return projectScopeValue(projectId);
	return USER_SCOPE_VALUE;
}

const currentScopeValue = computed(() => scopeValueOf(props.scope, props.projectId));
const scopeDraft = ref(currentScopeValue.value);
/** Whether this opening has moved the select. Only then may an edit carry a scope. */
const scopeTouched = ref(false);

/**
 * The row behind the card may resolve while this modal is open, which moves
 * `currentScopeValue` under the draft. A draft nobody has moved follows it, so an
 * untouched select cannot save the scope the card guessed before the row arrived.
 */
watch(currentScopeValue, (value) => {
	if (!scopeTouched.value) scopeDraft.value = value;
});

type ScopeOption = { value: string; label: string; icon: IconOrEmoji };

// The same icons as the settings modal: the user for "Just you", a globe for everyone.
const USER_ICON: IconOrEmoji = { type: 'icon', value: 'user' };
const INSTANCE_ICON: IconOrEmoji = { type: 'icon', value: 'globe' };

function optionFor(value: string): ScopeOption {
	const projects = projectsStore.myProjects;
	if (value === USER_SCOPE_VALUE) {
		return { value, label: preferenceScopeLabel(i18n, 'user', null, projects), icon: USER_ICON };
	}
	if (value === INSTANCE_SCOPE_VALUE) {
		return {
			value,
			label: preferenceScopeLabel(i18n, 'instance', null, projects),
			icon: INSTANCE_ICON,
		};
	}
	const projectId = value.slice(PROJECT_SCOPE_PREFIX.length);
	const project = projects.find((candidate) => candidate.id === projectId);
	return {
		value,
		label: preferenceScopeLabel(i18n, 'project', projectId, projects),
		icon: project?.type === 'personal' ? USER_ICON : (project?.icon ?? DEFAULT_PROJECT_ICON),
	};
}

/**
 * The scopes this user may write, from the same helpers the settings modal uses: the
 * user always, the thread's project when they hold `projectAiPreference:create` on it,
 * the instance when they hold the global `aiPreference:create`. The row's current scope
 * is always listed, so the select shows where the row is even when the user could not
 * put it there today. The server refuses a move the user may not make.
 */
const scopeOptions = computed<ScopeOption[]>(() => {
	const values = [USER_SCOPE_VALUE];
	const boundProjectId = thread.projectId;
	if (boundProjectId && canWriteProjectScope(boundProjectId)) {
		values.push(projectScopeValue(boundProjectId));
	}
	if (canWriteInstanceScope()) values.push(INSTANCE_SCOPE_VALUE);
	if (!values.includes(currentScopeValue.value)) values.push(currentScopeValue.value);
	return values.map(optionFor);
});

const selectedIcon = computed<IconOrEmoji>(
	() =>
		scopeOptions.value.find((option) => option.value === scopeDraft.value)?.icon ??
		DEFAULT_PROJECT_ICON,
);

function parseScope(): {
	scope: AiPreferenceScope;
	projectId: string | null;
	userId: string | null;
} {
	const value = scopeDraft.value;
	if (value === INSTANCE_SCOPE_VALUE) return { scope: 'instance', projectId: null, userId: null };
	if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
		return { scope: 'project', projectId: value.slice(PROJECT_SCOPE_PREFIX.length), userId: null };
	}
	// An edit must name its owner, and the server refuses a user-scope edit that does not.
	// A row that is already user-scoped keeps the owner the result gave, so a missing one is
	// refused instead of being read as a move to the caller. A move into user scope from
	// another scope has no prior owner, so it names the caller.
	const owner = props.scope === 'user' ? props.userId : usersStore.currentUser?.id;
	return { scope: 'user', projectId: null, userId: owner ?? null };
}

const draft = ref(props.content);
const busy = ref(false);
const errorMessage = ref('');

// Each opening starts from what is stored, so a cancelled edit leaves nothing behind.
watch(open, (isOpen) => {
	if (!isOpen) return;
	draft.value = props.content;
	scopeDraft.value = currentScopeValue.value;
	scopeTouched.value = false;
	errorMessage.value = '';
	void projectsStore.getMyProjects();
});

// The same rules, counter, and cap as the preference modal on the settings page.
const contentValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: AI_PREFERENCE_CONTENT_MAX_LENGTH } },
];

const validation = computed(() => aiPreferenceContentSchema.safeParse(draft.value));

const scopeChanged = computed(() => scopeDraft.value !== currentScopeValue.value);

// Nothing to accept when neither the text nor the scope changed: the preference is already saved.
const isDirty = computed(() => draft.value.trim() !== props.content || scopeChanged.value);
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
			// The scope travels only when the user moved it. The card's idea of where the row
			// lives is its own last write, which a move on the settings page or over MCP makes
			// stale, so restating it on a text-only edit would undo that move.
			...(scopeChanged.value ? parseScope() : {}),
		});
		if (!applyReturnedFact(response, 'instanceAi.preferenceCard.modal.saveFailed')) return;
		// The row the write returned, so the card reads the new scope without another read.
		contextStore.setRow(response.preference);
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
		// The row is gone, so nothing may resolve it again.
		contextStore.forgetRow(props.preferenceId);
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
					v-model="scopeDraft"
					size="large"
					:disabled="busy"
					:teleported="false"
					data-test-id="instance-ai-preference-modal-scope"
					@update:model-value="scopeTouched = true"
				>
					<template #prefix>
						<N8nText v-if="selectedIcon.type === 'emoji'" :class="$style.emoji">{{
							selectedIcon.value
						}}</N8nText>
						<N8nIcon v-else :icon="selectedIcon.value" />
					</template>
					<N8nOption
						v-for="option in scopeOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
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

.emoji {
	line-height: 1;
}

/* Removal is the one destructive action here, so it sits apart from Cancel and Save. */
.remove {
	--button--color: var(--color--text--danger);
	--button--color--hover: var(--color--text--danger);
	--button--color--active: var(--color--text--danger);

	margin-right: auto;
}
</style>
