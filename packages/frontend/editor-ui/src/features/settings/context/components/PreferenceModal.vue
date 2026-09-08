<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
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
import type { Rule, RuleGroup } from '@/Interface';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { PREFERENCE_MODAL_KEY, PREFERENCE_TEXT_MAX_LENGTH } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference, PreferenceScopeType } from '../context.types';
import { canWriteInstanceScope, canWriteProjectScope } from '../context.utils';

const props = withDefaults(
	defineProps<{
		mode?: 'new' | 'edit';
		preference?: Preference;
	}>(),
	{ mode: 'new', preference: undefined },
);

const i18n = useI18n();
const telemetry = useTelemetry();
const { showError } = useToast();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const contextStore = useContextStore();

const modalBus = createEventBus();
const loading = ref(false);

const USER_SCOPE_VALUE = 'user';
const INSTANCE_SCOPE_VALUE = 'instance';
const projectScopeValue = (id: string) => `project:${id}`;

const DEFAULT_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'layer-group' };

function initialScopeValue() {
	const preference = props.preference;
	if (!preference || preference.scopeType === 'user') return USER_SCOPE_VALUE;
	if (preference.scopeType === 'instance') return INSTANCE_SCOPE_VALUE;
	return preference.projectId ? projectScopeValue(preference.projectId) : USER_SCOPE_VALUE;
}

const form = reactive({
	text: props.preference?.text ?? '',
	scope: initialScopeValue(),
});

const textValid = ref(false);

const textValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: PREFERENCE_TEXT_MAX_LENGTH } },
];

type ScopeOption = { value: string; label: string; icon: IconOrEmoji; disabled: boolean };

const scopeOptions = computed<ScopeOption[]>(() => {
	const options: ScopeOption[] = [
		{
			value: USER_SCOPE_VALUE,
			label: i18n.baseText('settings.context.preferences.scope.user'),
			icon: { type: 'icon', value: 'user' },
			disabled: false,
		},
		{
			value: INSTANCE_SCOPE_VALUE,
			label: i18n.baseText('settings.context.preferences.scope.instance'),
			icon: { type: 'icon', value: 'globe' },
			disabled: !canWriteInstanceScope(),
		},
	];

	options.push(
		...projectsStore.myProjects
			.filter((project) => project.type === 'team')
			.map((project) => ({
				value: projectScopeValue(project.id),
				label: project.name ?? project.id,
				icon: (project.icon ?? DEFAULT_PROJECT_ICON) as IconOrEmoji,
				disabled: !canWriteProjectScope(project.id),
			})),
	);

	return options;
});

const selectedIcon = computed<IconOrEmoji>(
	() =>
		scopeOptions.value.find((option) => option.value === form.scope)?.icon ?? DEFAULT_PROJECT_ICON,
);

const modalTitle = computed(() =>
	props.mode === 'new'
		? i18n.baseText('settings.context.preferences.modal.title.create')
		: i18n.baseText('settings.context.preferences.modal.title.edit'),
);

const isValid = computed(() => textValid.value);

function parseScope(): { scopeType: PreferenceScopeType; projectId: string | null } {
	if (form.scope === USER_SCOPE_VALUE) return { scopeType: 'user', projectId: null };
	if (form.scope === INSTANCE_SCOPE_VALUE) return { scopeType: 'instance', projectId: null };
	return { scopeType: 'project', projectId: form.scope.slice('project:'.length) };
}

function closeModal() {
	uiStore.closeModal(PREFERENCE_MODAL_KEY);
}

async function handleSubmit() {
	if (!isValid.value || loading.value) return;

	const { scopeType, projectId } = parseScope();

	try {
		loading.value = true;
		if (props.mode === 'new') {
			await contextStore.createPreference({ text: form.text, scopeType, projectId });
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_CREATED_PREFERENCE, {
				scope_type: scopeType,
				text_length: form.text.length,
				...(projectId ? { project_id: projectId } : {}),
			});
		} else if (props.preference) {
			await contextStore.updatePreference(props.preference.id, {
				text: form.text,
				scopeType,
				projectId,
			});
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
				scope_type: scopeType,
				text_length: form.text.length,
				scope_changed:
					scopeType !== props.preference.scopeType || projectId !== props.preference.projectId,
				...(projectId ? { project_id: projectId } : {}),
			});
		}
		closeModal();
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
					v-model="form.text"
					name="text"
					type="textarea"
					focus-initially
					required
					:label="i18n.baseText('settings.context.preferences.modal.text.label')"
					:placeholder="i18n.baseText('settings.context.preferences.modal.text.placeholder')"
					:autosize="{ minRows: 3, maxRows: 8 }"
					:maxlength="PREFERENCE_TEXT_MAX_LENGTH"
					show-word-limit
					:validate-on-blur="false"
					:validation-rules="textValidationRules"
					data-test-id="preference-modal-text-input"
					@validate="(value: boolean) => (textValid = value)"
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
							:disabled="option.disabled"
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
