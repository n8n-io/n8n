<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { VARIABLE_MODAL_KEY } from '@/constants';
import { computed, reactive, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useToast } from '@/composables/useToast';
import {
	N8nFormInput,
	N8nInputLabel,
	N8nButton,
	N8nSelect,
	N8nOption,
	N8nCallout,
} from '@n8n/design-system';
import type { Rule, RuleGroup } from '@/Interface';
import type { EnvironmentVariable } from '@/features/environments.ee/environments.types';
import { useEnvironmentsStore } from '@/features/environments.ee/environments.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		mode?: 'new' | 'edit';
		variable?: EnvironmentVariable;
	}>(),
	{
		mode: 'new',
	},
);

const i18n = useI18n();
const { showError } = useToast();
const uiStore = useUIStore();
const environmentsStore = useEnvironmentsStore();
const projectsStore = useProjectsStore();

const modalBus = createEventBus();
const loading = ref(false);
const validateOnBlur = ref(false);

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

const form = reactive<{
	key: string;
	value: string;
	projectId?: string | null;
}>({
	key: props.variable?.key || '',
	value: props.variable?.value || '',
	projectId: props.variable ? props.variable.project?.id : projectsStore.currentProjectId,
});

const formValidation = reactive<{
	key: boolean;
	value: boolean;
}>({
	key: false,
	value: false,
});

const keyExistsInSameScope = computed(() => {
	if (!form.key) return false;

	// Check if a variable with the same key exists in the same project scope
	const existingVariable = environmentsStore.variables.find((v: EnvironmentVariable) => {
		// When editing, exclude the current variable being edited
		if (props.mode === 'edit' && v.id === props.variable?.id) {
			return false;
		}

		// Check if the key matches
		if (v.key !== form.key) return false;

		// Check if both are global (no project)
		if (!v.project && !form.projectId) return true;

		// Check if both belong to the same project
		return v.project && v.project?.id === form.projectId;
	});

	return !!existingVariable;
});

const globalVariableExistsWarning = computed(() => {
	if (!form.key || keyExistsInSameScope.value) return false;

	// Only show warning if the current variable is global
	const isCurrentVariableGlobal = !form.projectId;
	if (isCurrentVariableGlobal) return false;

	// Check if a global variable (without project) with the same key exists
	const existingGlobalVariable = environmentsStore.variables.find(
		(v: EnvironmentVariable) => v.key === form.key && !v.project,
	);

	return !!existingGlobalVariable;
});

const isValid = computed(
	() => Object.values(formValidation).every((value) => value) && !keyExistsInSameScope.value,
);

const modalTitle = computed(() =>
	props.mode === 'new'
		? i18n.baseText('variables.modal.title.create')
		: i18n.baseText('variables.modal.title.edit'),
);

const projectOptions = computed<Array<{ value: string; label: string }>>(() => {
	const options: Array<{ value: string; label: string }> = [
		{
			value: '',
			label: i18n.baseText('variables.modal.scope.global'),
		},
	];

	if (projectsStore.availableProjects) {
		options.push(
			...projectsStore.availableProjects
				.filter((project) => project.type !== 'personal')
				.map((project) => ({
					value: project.id,
					label: project.name || project.id,
				})),
		);
	}

	return options;
});

const showScopeField = computed(() => {
	// Show scope field only when creating a new variable and not in a project context
	return !projectsStore.currentProjectId;
});

function closeModal() {
	uiStore.closeModal(VARIABLE_MODAL_KEY);
}

async function handleSubmit() {
	validateOnBlur.value = true;

	if (!isValid.value) {
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
			await environmentsStore.createVariable(variablePayload);
		} else if (props.variable) {
			await environmentsStore.updateVariable({
				id: props.variable.id,
				...variablePayload,
			});
		}

		closeModal();
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.save'));
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<Modal
		:title="modalTitle"
		:event-bus="modalBus"
		:name="VARIABLE_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
		:close-on-esc="true"
		:close-on-click-modal="false"
		:show-close="true"
	>
		<template #content>
			<div :class="$style.form" @keyup.enter="handleSubmit">
				<N8nFormInput
					v-model="form.key"
					:label="i18n.baseText('variables.modal.key.label')"
					name="key"
					focus-initially
					data-test-id="variable-modal-key-input"
					:placeholder="i18n.baseText('variables.editing.key.placeholder')"
					required
					:validate-on-blur="validateOnBlur"
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
					name="value"
					:label="i18n.baseText('variables.modal.value.label')"
					data-test-id="variable-modal-value-input"
					:placeholder="i18n.baseText('variables.editing.value.placeholder')"
					type="textarea"
					:autosize="{ minRows: 3, maxRows: 6 }"
					:maxlength="VALUE_MAX_LENGTH"
					:validate-on-blur="validateOnBlur"
					:validation-rules="valueValidationRules"
					@validate="(value: boolean) => (formValidation.value = value)"
				/>

				<N8nInputLabel
					v-if="showScopeField"
					:label="i18n.baseText('variables.modal.scope.label')"
					color="text-dark"
				>
					<N8nSelect
						v-model="form.projectId"
						size="large"
						filterable
						data-test-id="variable-modal-scope-select"
					>
						<N8nOption
							v-for="option in projectOptions"
							:key="option.value || 'global'"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="tertiary"
					:label="i18n.baseText('variables.modal.button.cancel')"
					data-test-id="variable-modal-cancel-button"
					@click="closeModal"
				/>
				<N8nButton
					:loading="loading"
					:disabled="!isValid"
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
	gap: var(--spacing-s);
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing-xs);
}
</style>
