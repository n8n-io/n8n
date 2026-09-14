<script lang="ts" setup>
import type { AiPreferenceScope } from '@n8n/api-types';
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	N8nButton,
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
import { useUsersStore } from '@n8n/stores/users.store';
import type { Rule, RuleGroup } from '@/Interface';

import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { PREFERENCE_TEXT_MAX_LENGTH } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference } from '../context.types';
import {
	canWriteInstanceScope,
	canWriteProjectScope,
	preferenceAudience,
	preferenceScope,
	preferenceUserName,
	toPreferencePermissions,
} from '../context.utils';

/**
 * The create and edit dialog of the preferences page. The page owns it: `open`
 * shows it, `preference` names the row to edit or is null for a new one, and
 * `saved` tells the page to reload.
 */
const props = defineProps<{
	open: boolean;
	preference: Preference | null;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	saved: [];
}>();

const mode = computed(() => (props.preference ? 'edit' : 'new'));
const preference = computed(() => props.preference);

const i18n = useI18n();
const telemetry = useTelemetry();
const { showError } = useToast();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const contextStore = useContextStore();

const loading = ref(false);

/**
 * The component stays mounted between openings, so a slow save can outlive the
 * dialog it started in. Each opening gets a new token, and a save reports back
 * only when its token is still current, so it never closes a newer dialog.
 */
let openToken = 0;

/*
 * The select holds one string per target. A user row follows its user into every
 * project; a project row, personal project included, applies only there.
 */
const USER_SCOPE_VALUE = 'user';
const INSTANCE_SCOPE_VALUE = 'instance';
const USER_SCOPE_PREFIX = 'user:';
const PROJECT_SCOPE_PREFIX = 'project:';
const projectScopeValue = (id: string) => `${PROJECT_SCOPE_PREFIX}${id}`;
const userScopeValue = (id: string) => `${USER_SCOPE_PREFIX}${id}`;

const USER_ICON: IconOrEmoji = { type: 'icon', value: 'user' };
const INSTANCE_ICON: IconOrEmoji = { type: 'icon', value: 'globe' };

const currentUserId = computed(() => usersStore.currentUser?.id);

function initialScopeValue() {
	const editing = preference.value;
	if (!editing) return USER_SCOPE_VALUE;

	const scope = preferenceScope(editing);
	if (scope === 'instance') return INSTANCE_SCOPE_VALUE;
	if (scope === 'project' && editing.projectId) return projectScopeValue(editing.projectId);
	// Another user's row keeps its owner. A bare `user` scope would hand it to the caller.
	if (editing.userId && editing.userId !== currentUserId.value) {
		return userScopeValue(editing.userId);
	}
	return USER_SCOPE_VALUE;
}

const initialScope = ref(initialScopeValue());

const form = reactive({
	content: preference.value?.content ?? '',
	scope: initialScope.value,
});

/** Every opening starts from the row it was opened for, not from the last edit. */
function resetForm() {
	initialScope.value = initialScopeValue();
	form.content = preference.value?.content ?? '';
	form.scope = initialScope.value;
	contentValid.value = false;
}

const contentValid = ref(false);

const contentValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: PREFERENCE_TEXT_MAX_LENGTH } },
];

/**
 * Stored and injected trimmed: the prompt renderer drops a blank preference, so
 * whitespace-only text would save and then never reach the AI.
 */
const trimmedContent = computed(() => form.content.trim());

/** `usable` says whether the caller may create a preference at that target. */
type ScopeOption = { value: string; label: string; icon: IconOrEmoji; usable: boolean };

/**
 * The option for the row's current target when the caller's own list lacks it: an
 * admin editing another user's row or personal project, or a project they are not
 * listed in.
 */
function currentTargetOption(editing: Preference): ScopeOption {
	const audience = preferenceAudience(editing, currentUserId.value);
	if (audience.kind === 'user') {
		return {
			value: initialScope.value,
			label: i18n.baseText('settings.context.preferences.scope.otherUser', {
				interpolate: { name: preferenceUserName(audience.user) },
			}),
			icon: USER_ICON,
			usable: true,
		};
	}
	if (audience.kind === 'personalProject') {
		return {
			value: initialScope.value,
			label: i18n.baseText('settings.context.preferences.scope.otherPersonalProject', {
				interpolate: { name: audience.ownerName },
			}),
			icon: USER_ICON,
			usable: true,
		};
	}
	return {
		value: initialScope.value,
		label: editing.project?.name ?? editing.projectId ?? '',
		icon: editing.project?.icon ?? DEFAULT_PROJECT_ICON,
		usable: true,
	};
}

const scopeOptions = computed<ScopeOption[]>(() => {
	const options: ScopeOption[] = [
		{
			value: USER_SCOPE_VALUE,
			label: i18n.baseText('settings.context.preferences.scope.user'),
			icon: USER_ICON,
			usable: true,
		},
	];

	// The caller's personal project sits next to the user scope: both reach one user,
	// but this one applies only when that project is in scope.
	const personal = projectsStore.myProjects.find((project) => project.type === 'personal');
	if (personal) {
		options.push({
			value: projectScopeValue(personal.id),
			label: i18n.baseText('settings.context.preferences.scope.personalProject'),
			icon: USER_ICON,
			usable: canWriteProjectScope(personal.id),
		});
	}

	options.push({
		value: INSTANCE_SCOPE_VALUE,
		label: i18n.baseText('settings.context.preferences.scope.instance'),
		icon: INSTANCE_ICON,
		usable: canWriteInstanceScope(),
	});

	options.push(
		...projectsStore.myProjects
			.filter((project) => project.type === 'team')
			.map((project) => ({
				value: projectScopeValue(project.id),
				label: project.name ?? project.id,
				icon: project.icon ?? DEFAULT_PROJECT_ICON,
				usable: canWriteProjectScope(project.id),
			})),
	);

	const editing = preference.value;
	if (editing && !options.some((option) => option.value === initialScope.value)) {
		options.unshift(currentTargetOption(editing));
	}

	// Targets the caller cannot use are left out rather than greyed out. A move
	// deletes the row where it is and creates it at the target, so it needs the
	// delete right on the row and the create right at the target. Staying put needs
	// only the update right the Edit button already checked, so the current target
	// always stays.
	const canLeave = !editing || toPreferencePermissions(editing).delete;
	return options.filter(
		(option) => option.value === initialScope.value || (canLeave && option.usable),
	);
});

const selectedIcon = computed<IconOrEmoji>(
	() =>
		scopeOptions.value.find((option) => option.value === form.scope)?.icon ?? DEFAULT_PROJECT_ICON,
);

const modalTitle = computed(() =>
	mode.value === 'new'
		? i18n.baseText('settings.context.preferences.modal.title.create')
		: i18n.baseText('settings.context.preferences.modal.title.edit'),
);

const isValid = computed(() => contentValid.value && trimmedContent.value.length > 0);

function parseScope(): {
	scope: AiPreferenceScope;
	projectId: string | null;
	userId: string | null;
} {
	if (form.scope === USER_SCOPE_VALUE) return { scope: 'user', projectId: null, userId: null };
	if (form.scope === INSTANCE_SCOPE_VALUE) {
		return { scope: 'instance', projectId: null, userId: null };
	}
	if (form.scope.startsWith(USER_SCOPE_PREFIX)) {
		return { scope: 'user', projectId: null, userId: form.scope.slice(USER_SCOPE_PREFIX.length) };
	}
	return {
		scope: 'project',
		projectId: form.scope.slice(PROJECT_SCOPE_PREFIX.length),
		userId: null,
	};
}

function closeModal() {
	emit('update:open', false);
}

async function handleSubmit() {
	if (!isValid.value || loading.value) return;
	const token = openToken;

	const { scope, projectId, userId } = parseScope();
	const content = trimmedContent.value;
	// The owner travels only when it is not the caller, so an own row stays a plain `user` scope.
	const payload = { content, scope, projectId, ...(userId ? { userId } : {}) };

	try {
		loading.value = true;
		if (mode.value === 'new') {
			await contextStore.createPreference(payload);
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_CREATED_PREFERENCE, {
				scope_type: scope,
				text_length: content.length,
				...(projectId ? { project_id: projectId } : {}),
			});
		} else if (preference.value) {
			await contextStore.updatePreference(preference.value.id, payload);
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
				scope_type: scope,
				text_length: content.length,
				scope_changed: form.scope !== initialScope.value,
				...(projectId ? { project_id: projectId } : {}),
			});
		}
		// The write and its telemetry still count when the dialog was closed meanwhile;
		// only telling the page to close is unsafe, and an error is still worth reporting.
		if (token === openToken) emit('saved');
	} catch (error) {
		showError(error, i18n.baseText('settings.context.preferences.error.save'));
	} finally {
		loading.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		openToken += 1;
		resetForm();
		void projectsStore.getMyProjects();
	},
	{ immediate: true },
);
</script>

<template>
	<N8nDialog
		:open="open"
		:header="modalTitle"
		size="medium"
		:disable-outside-pointer-events="true"
		data-test-id="preference-modal"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.form">
			<N8nFormInput
				v-model="form.content"
				name="content"
				type="textarea"
				focus-initially
				required
				:label="i18n.baseText('settings.context.preferences.modal.text.label')"
				:placeholder="i18n.baseText('settings.context.preferences.modal.text.placeholder')"
				:autosize="{ minRows: 3, maxRows: 8 }"
				:maxlength="PREFERENCE_TEXT_MAX_LENGTH"
				:validate-on-blur="false"
				:validation-rules="contentValidationRules"
				data-test-id="preference-modal-text-input"
				@validate="(value: boolean) => (contentValid = value)"
			/>
			<!-- The form input has no counter of its own, and the cap is worth seeing. -->
			<N8nText
				:class="$style.counter"
				size="small"
				color="text-light"
				data-test-id="preference-modal-counter"
			>
				{{ form.content.length }} / {{ PREFERENCE_TEXT_MAX_LENGTH }}
			</N8nText>

			<N8nInputLabel
				:label="i18n.baseText('settings.context.preferences.modal.scope.label')"
				color="text-dark"
			>
				<N8nSelect
					v-model="form.scope"
					size="large"
					filterable
					:teleported="false"
					data-test-id="preference-modal-scope-select"
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
					>
						<div :class="$style.optionContent">
							<N8nText v-if="option.icon.type === 'emoji'" :class="$style.emoji">{{
								option.icon.value
							}}</N8nText>
							<N8nIcon v-else :icon="option.icon.value" />
							<span>{{ option.label }}</span>
						</div>
					</N8nOption>
				</N8nSelect>
			</N8nInputLabel>
		</div>
		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('settings.context.preferences.modal.cancel')"
				data-test-id="preference-modal-cancel-button"
				@click="closeModal"
			/>
			<N8nButton
				:loading="loading"
				:disabled="!isValid"
				:label="i18n.baseText('settings.context.preferences.modal.save')"
				data-test-id="preference-modal-save-button"
				@click="handleSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
// The dialog header and footer bring their own spacing; the body sets the gap
// to both, as the design system's dialog examples do.
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.counter {
	align-self: flex-end;
	margin-top: calc(-1 * var(--spacing--xs));
}

.optionContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.emoji {
	line-height: 1;
}
</style>
