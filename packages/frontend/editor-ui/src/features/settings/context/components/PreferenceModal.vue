<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	N8nButton,
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

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { PREFERENCE_MODAL_KEY, PREFERENCE_TEXT_MAX_LENGTH } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference, PreferenceScopeType } from '../context.types';
import {
	canWriteInstanceScope,
	canWriteProjectScope,
	preferenceAudience,
	preferenceScope,
	preferenceUserName,
	toPreferencePermissions,
} from '../context.utils';

// The modal registry mounts this and hands the payload through `data`, so the
// shape follows the loader rather than the call site.
const props = withDefaults(
	defineProps<{
		modalName?: string;
		data?: { mode?: 'new' | 'edit'; preference?: Preference };
	}>(),
	{ modalName: PREFERENCE_MODAL_KEY, data: () => ({}) },
);

const mode = computed(() => props.data.mode ?? 'new');
const preference = computed(() => props.data.preference);

const i18n = useI18n();
const telemetry = useTelemetry();
const { showError } = useToast();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const contextStore = useContextStore();

const modalBus = createEventBus();
const loading = ref(false);

/**
 * The modal root unmounts this component when the dialog closes and mounts a fresh
 * one when it reopens, so a slow save can outlive its own dialog. Closing on a stale
 * continuation would shut the dialog the user just opened.
 */
let disposed = false;
onBeforeUnmount(() => {
	disposed = true;
});

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

const initialScope = initialScopeValue();

const form = reactive({
	content: preference.value?.content ?? '',
	scope: initialScope,
});

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
			value: initialScope,
			label: i18n.baseText('settings.context.preferences.scope.otherUser', {
				interpolate: { name: preferenceUserName(audience.user) },
			}),
			icon: USER_ICON,
			usable: true,
		};
	}
	if (audience.kind === 'personalProject') {
		return {
			value: initialScope,
			label: i18n.baseText('settings.context.preferences.scope.otherPersonalProject', {
				interpolate: { name: audience.ownerName },
			}),
			icon: USER_ICON,
			usable: true,
		};
	}
	return {
		value: initialScope,
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
	if (editing && !options.some((option) => option.value === initialScope)) {
		options.unshift(currentTargetOption(editing));
	}

	// Targets the caller cannot use are left out rather than greyed out. A move
	// deletes the row where it is and creates it at the target, so it needs the
	// delete right on the row and the create right at the target. Staying put needs
	// only the update right the Edit button already checked, so the current target
	// always stays.
	const canLeave = !editing || toPreferencePermissions(editing).delete;
	return options.filter((option) => option.value === initialScope || (canLeave && option.usable));
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
	scope: PreferenceScopeType;
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
	uiStore.closeModal(PREFERENCE_MODAL_KEY);
}

async function handleSubmit() {
	if (!isValid.value || loading.value) return;

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
				scope_changed: form.scope !== initialScope,
				...(projectId ? { project_id: projectId } : {}),
			});
		}
		// The write and its telemetry still count when the dialog is gone; only the
		// close is unsafe, and an error is still worth reporting either way.
		if (!disposed) closeModal();
	} catch (error) {
		showError(error, i18n.baseText('settings.context.preferences.error.save'));
	} finally {
		loading.value = false;
	}
}

onMounted(() => {
	void projectsStore.getMyProjects();
});
</script>

<template>
	<Modal
		:title="modalTitle"
		:event-bus="modalBus"
		:name="PREFERENCE_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
		:close-on-esc="true"
		:close-on-click-modal="false"
		:show-close="true"
	>
		<template #content>
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
					show-word-limit
					:validate-on-blur="false"
					:validation-rules="contentValidationRules"
					data-test-id="preference-modal-text-input"
					@validate="(value: boolean) => (contentValid = value)"
				/>

				<N8nInputLabel
					:label="i18n.baseText('settings.context.preferences.modal.scope.label')"
					color="text-dark"
				>
					<N8nSelect
						v-model="form.scope"
						size="large"
						filterable
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
		</template>
		<template #footer>
			<div :class="$style.footer">
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
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
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
