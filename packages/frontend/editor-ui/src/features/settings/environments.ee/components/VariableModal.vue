<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import { VARIABLE_MODAL_KEY } from '../environments.constants';
import { computed, reactive, ref, onMounted, nextTick } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nFormInput,
	N8nInputLabel,
	N8nButton,
	N8nSelect,
	N8nOption,
	N8nCallout,
	N8nText,
	N8nIcon,
} from '@n8n/design-system';
import type { Rule, RuleGroup } from '@/Interface';
import type { EnvironmentVariable, VariableModalOptions } from '../environments.types';
import { useEnvironmentsStore } from '../environments.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import type { IconOrEmoji } from '@n8n/design-system';

const props = withDefaults(defineProps<VariableModalOptions>(), {
	mode: 'new',
	variable: undefined,
	projectId: undefined,
});

const i18n = useI18n();
const { showError } = useToast();
const uiStore = useUIStore();
const environmentsStore = useEnvironmentsStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const sourceControlStore = useSourceControlStore();

const modalBus = createEventBus();
const loading = ref(false);
const keyInputRef = ref<InstanceType<typeof N8nFormInput> | null>(null);

const keyValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: 50 } },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /^[A-Za-z0-9_]+$/,
			message: i18n.baseText('variables.editing.key.error.regex'),
		},
	},
];

const VALUE_MAX_LENGTH = 1000;
const valueValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: VALUE_MAX_LENGTH } },
];

function getInitialProjectId() {
	if (props.destination?.kind === 'resolved') return props.destination.project.id;
	if (props.destination?.kind === 'pending') return props.destination.id;
	if (props.variable) return props.variable.project?.id;
	if (props.projectId !== undefined) return props.projectId;
	return projectsStore.currentProjectId;
}

const form = reactive<{
	key: string;
	value: string;
	projectId?: string | null;
}>({
	key: props.variable?.key ?? props.initialValues?.key ?? '',
	value: props.variable?.value ?? props.initialValues?.value ?? '',
	projectId: getInitialProjectId(),
});

const formValidation = reactive<{
	key: boolean;
	value: boolean;
}>({
	key: false,
	value: false,
});

const keyExistsInSameScope = computed(
	() =>
		!!form.key &&
		environmentsStore
			.getVariablesInScope(form.projectId)
			.some(
				(variable) =>
					variable.key === form.key &&
					(props.mode !== 'edit' || variable.id !== props.variable?.id),
			),
);

const globalVariableExistsWarning = computed(
	() =>
		!!form.projectId &&
		!keyExistsInSameScope.value &&
		environmentsStore.getVariablesInScope(null).some((variable) => variable.key === form.key),
);

const isValid = computed(
	() => Object.values(formValidation).every((value) => value) && !keyExistsInSameScope.value,
);

const modalTitle = computed(() =>
	props.mode === 'new'
		? i18n.baseText('variables.modal.title.create')
		: i18n.baseText('variables.modal.title.edit'),
);

type ScopeOption = {
	value: string;
	label: string;
	icon: IconOrEmoji;
	disabled: boolean;
};

const projectOptions = computed<ScopeOption[]>(() => {
	const readOnly = sourceControlStore.preferences.branchReadOnly;

	const options: ScopeOption[] = [
		{
			value: '',
			label: i18n.baseText('variables.modal.scope.global'),
			icon: { type: 'icon', value: 'database' },
			disabled:
				readOnly || !getResourcePermissions(usersStore.currentUser?.globalScopes).variable?.create,
		},
	];

	if (projectsStore.personalProject) {
		options.push({
			value: projectsStore.personalProject.id,
			label: i18n.baseText('projects.menu.personal'),
			icon: { type: 'icon', value: 'user' },
			disabled:
				readOnly ||
				!getResourcePermissions(projectsStore.personalProject.scopes).projectVariable?.create,
		});
	}

	options.push(
		...projectsStore.myProjects
			.filter((project) => project.type === 'team')
			.map((project) => {
				const icon = (project.icon || {
					type: 'icon' as const,
					value: 'layer-group',
				}) as IconOrEmoji;
				return {
					value: project.id,
					label: project.name ?? project.id,
					icon,
					disabled: readOnly || !getResourcePermissions(project.scopes).projectVariable?.create,
				};
			}),
	);

	return options;
});

const selectedProjectIcon = computed<IconOrEmoji>(() => {
	const selectedOption = projectOptions.value.find((option) => option.value === form.projectId);
	return selectedOption?.icon ?? { type: 'icon' as const, value: 'database' };
});

const showScopeField = computed(() => {
	// Hidden when the caller already chose a scope (projectId prop) or we're in a project
	return (
		!props.destination &&
		props.mode === 'new' &&
		props.projectId === undefined &&
		!projectsStore.currentProjectId
	);
});

const destinationName = computed(() =>
	props.destination?.kind === 'resolved' ? props.destination.project.name : props.destination?.name,
);

const canCreate = computed(() => {
	if (!props.onCreate) return true;
	if (sourceControlStore.preferences.branchReadOnly) return false;
	const destination = props.destination;
	if (!destination)
		return !!getResourcePermissions(usersStore.currentUser?.globalScopes).variable.create;
	const project =
		destination.kind === 'resolved'
			? destination.project
			: projectsStore.myProjects.find((item) => item.id === destination.id);
	if (project) return !!getResourcePermissions(project.scopes).projectVariable.create;
	return destination.kind === 'pending' && destination.permissions.create;
});

function closeModal() {
	if (loading.value) return;
	uiStore.closeModal(VARIABLE_MODAL_KEY);
}

async function handleSubmit() {
	if (loading.value || !isValid.value || !canCreate.value) {
		return;
	}

	try {
		loading.value = true;

		const variablePayload: Omit<EnvironmentVariable, 'id' | 'project'> & {
			projectId?: string | null;
		} = {
			key: form.key,
			value: form.value,
		};

		if (typeof form.projectId !== 'undefined') {
			variablePayload.projectId = form.projectId;
		}

		if (props.mode === 'new') {
			await (props.onCreate ?? environmentsStore.createVariable)(variablePayload);
		} else if (props.variable) {
			await environmentsStore.updateVariable({
				id: props.variable.id,
				...variablePayload,
			});
		}

		uiStore.closeModal(VARIABLE_MODAL_KEY);
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.save'));
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	void projectsStore.getMyProjects();
	await nextTick();
	const input = keyInputRef.value?.inputRef;
	if (input) {
		requestAnimationFrame(() => {
			input.focus();
		});
	}
	if (props.mode === 'new') {
		// This validation rule is not added for "edit" mode
		// since we added this rule a while after variables were released
		// and we want to add the "don't start with number" validation in a backwards-compatible manner.
		keyValidationRules.push({
			name: 'MATCH_REGEX',
			config: {
				regex: /^[A-Za-z_]/,
				message: i18n.baseText('variables.editing.key.error.regex-no-start-with-number'),
			},
		});
	}
});
</script>

<template>
	<Modal
		:title="modalTitle"
		:event-bus="modalBus"
		:name="VARIABLE_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
		:show-close="!loading"
		:before-close="() => !loading"
		:append-to-body="appendToBody"
	>
		<template #content>
			<div :class="$style.form" @keyup.enter="handleSubmit">
				<N8nCallout v-if="notice" theme="info">{{ notice() }}</N8nCallout>
				<N8nText v-if="destinationName">{{ destinationName }}</N8nText>
				<N8nFormInput
					ref="keyInputRef"
					v-model="form.key"
					:disabled="fixedKey || loading"
					:label="i18n.baseText('variables.modal.key.label')"
					name="key"
					focus-initially
					data-test-id="variable-modal-key-input"
					:placeholder="i18n.baseText('variables.editing.key.placeholder')"
					required
					:validate-on-blur="true"
					:validation-rules="keyValidationRules"
					@validate="(value: boolean) => (formValidation.key = value)"
				/>

				<N8nCallout
					v-if="keyExistsInSameScope"
					theme="danger"
					data-test-id="variable-modal-key-exists-error"
				>
					{{ i18n.baseText('variables.modal.error.keyExistsInProject') }}
				</N8nCallout>

				<N8nCallout
					v-else-if="globalVariableExistsWarning"
					theme="warning"
					data-test-id="variable-modal-global-exists-warning"
				>
					{{ i18n.baseText('variables.modal.warning.globalKeyExists') }}
				</N8nCallout>

				<N8nFormInput
					v-model="form.value"
					:disabled="loading"
					name="value"
					:label="i18n.baseText('variables.modal.value.label')"
					data-test-id="variable-modal-value-input"
					:placeholder="i18n.baseText('variables.editing.value.placeholder')"
					type="textarea"
					:autosize="{ minRows: 3, maxRows: 6 }"
					:maxlength="VALUE_MAX_LENGTH"
					:validate-on-blur="true"
					:validation-rules="valueValidationRules"
					@validate="(value: boolean) => (formValidation.value = value)"
				/>

				<div v-if="showScopeField">
					<N8nInputLabel :label="i18n.baseText('variables.modal.scope.label')" color="text-dark">
						<N8nSelect
							v-model="form.projectId"
							size="large"
							filterable
							data-test-id="variable-modal-scope-select"
						>
							<template #prefix>
								<N8nText
									v-if="selectedProjectIcon?.type === 'emoji'"
									:class="$style.menuItemEmoji"
									>{{ selectedProjectIcon.value }}</N8nText
								>
								<N8nIcon v-else-if="selectedProjectIcon?.value" :icon="selectedProjectIcon.value" />
							</template>
							<N8nOption
								v-for="option in projectOptions"
								:key="option.value || 'global'"
								:value="option.value"
								:label="option.label"
								:disabled="option.disabled"
								:class="{ [$style.globalOption]: option.value === '' }"
							>
								<div :class="$style.optionContent">
									<N8nText v-if="option.icon?.type === 'emoji'" :class="$style.menuItemEmoji">{{
										option.icon.value
									}}</N8nText>
									<N8nIcon v-else-if="option.icon?.value" :icon="option.icon.value" />
									<span>{{ option.label }}</span>
								</div>
							</N8nOption>
						</N8nSelect>
					</N8nInputLabel>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('variables.modal.button.cancel')"
					data-test-id="variable-modal-cancel-button"
					:disabled="loading"
					@click="closeModal"
				/>
				<N8nButton
					:loading="loading"
					:disabled="!isValid || !canCreate || loading"
					:label="i18n.baseText('variables.modal.button.save')"
					data-test-id="variable-modal-save-button"
					@click="handleSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--xs);
}

.optionContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.iconEmoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.globalOption {
	position: relative;
	margin-bottom: var(--spacing--sm);
	overflow: visible;

	&::after {
		content: '';
		position: absolute;
		bottom: calc(var(--spacing--sm) / -2);
		left: var(--spacing--xs);
		right: var(--spacing--xs);
		height: 1px;
		background-color: var(--color--foreground);
	}
}
</style>
