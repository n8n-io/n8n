<script setup lang="ts">
import type {
	CreateWorkflowCheckDto,
	UpdateWorkflowCheckDto,
	WorkflowAuthoringCheckSeverity,
	WorkflowCheckConfigField,
	WorkflowCheckTypeDto,
} from '@n8n/api-types';
import { N8nButton, N8nInput, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { ElSwitch } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';

import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_AUTHORING_CHECK_FORM_MODAL_KEY } from '@/features/workflows/authoringChecks/authoringChecks.constants';
import { useWorkflowAuthoringChecksStore } from '@/features/workflows/authoringChecks/authoringChecks.store';

const props = defineProps<{
	data: {
		mode: 'create' | 'edit';
		instanceId?: string;
	};
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const uiStore = useUIStore();
const store = useWorkflowAuthoringChecksStore();
const nodeTypesStore = useNodeTypesStore();
const modalBus = createEventBus();

const name = ref('');
const typeKey = ref('');
const severity = ref<WorkflowAuthoringCheckSeverity>('warning');
const enabled = ref(true);
const config = ref<Record<string, string>>({});
const validationError = ref('');
const submitting = ref(false);
const nodeTypeFilters = ref<Record<string, string>>({});
const isStatic = ref(false);

const isEdit = computed(() => props.data.mode === 'edit');

const nodeTypeOptions = computed(() =>
	nodeTypesStore.visibleNodeTypes
		.map((node) => ({ value: node.name, label: node.displayName }))
		.sort((a, b) => a.label.localeCompare(b.label)),
);

function filteredNodeTypeOptions(fieldName: string) {
	const query = nodeTypeFilters.value[fieldName]?.toLowerCase().trim() ?? '';
	if (!query) return nodeTypeOptions.value;
	return nodeTypeOptions.value.filter(
		(option) =>
			option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query),
	);
}

function onNodeTypeFilter(fieldName: string, query: string) {
	nodeTypeFilters.value[fieldName] = query;
}

const selectedType = computed<WorkflowCheckTypeDto | undefined>(() =>
	store.types.find((t) => t.type === typeKey.value),
);

const typeFields = computed<WorkflowCheckConfigField[]>(
	() => selectedType.value?.configSchema.fields ?? [],
);

const modalTitle = computed(() =>
	isEdit.value
		? i18n.baseText('settings.workflowAuthoringChecks.modal.editTitle')
		: i18n.baseText('settings.workflowAuthoringChecks.modal.createTitle'),
);

function initConfigForType(type: WorkflowCheckTypeDto, initial?: Record<string, unknown>) {
	const next: Record<string, string> = {};
	for (const field of type.configSchema.fields) {
		const value = initial?.[field.name];
		next[field.name] = typeof value === 'string' ? value : '';
	}
	config.value = next;
}

watch(typeKey, (next) => {
	if (!next || isEdit.value) return;
	const type = store.types.find((t) => t.type === next);
	if (type) {
		severity.value = type.defaultSeverity;
		initConfigForType(type);
	}
});

onMounted(async () => {
	try {
		await store.ensureTypesLoaded();
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.fetchError'));
	}

	if (isEdit.value && props.data.instanceId) {
		const instance = store.instances.find((i) => i.id === props.data.instanceId);
		if (instance) {
			name.value = instance.name;
			typeKey.value = instance.type;
			severity.value = instance.severity;
			enabled.value = instance.enabled;
			isStatic.value = instance.static;
			const type = store.types.find((t) => t.type === instance.type);
			if (type) initConfigForType(type, instance.config);
		}
	} else if (store.types.length > 0) {
		typeKey.value = store.types[0].type;
	}
});

function validate(): boolean {
	if (isStatic.value) return true;
	if (!name.value.trim()) return false;
	if (!typeKey.value) return false;
	for (const field of typeFields.value) {
		if (field.required && !config.value[field.name]?.trim()) return false;
	}
	return true;
}

function closeModal() {
	uiStore.closeModal(WORKFLOW_AUTHORING_CHECK_FORM_MODAL_KEY);
}

async function onSubmit() {
	if (!validate()) {
		validationError.value = i18n.baseText('settings.workflowAuthoringChecks.modal.validationError');
		return;
	}
	validationError.value = '';
	submitting.value = true;

	try {
		if (isEdit.value && props.data.instanceId) {
			const patch: UpdateWorkflowCheckDto = isStatic.value
				? {
						severity: severity.value,
						enabled: enabled.value,
					}
				: {
						name: name.value.trim(),
						config: config.value,
						severity: severity.value,
						enabled: enabled.value,
					};
			await store.updateInstance(props.data.instanceId, patch);
			showMessage({
				title: i18n.baseText('settings.workflowAuthoringChecks.modal.editTitle'),
				type: 'success',
			});
		} else {
			const payload: CreateWorkflowCheckDto = {
				name: name.value.trim(),
				type: typeKey.value,
				config: config.value,
				severity: severity.value,
				enabled: enabled.value,
			};
			await store.createInstance(payload);
			showMessage({
				title: i18n.baseText('settings.workflowAuthoringChecks.modal.createTitle'),
				type: 'success',
			});
		}
		closeModal();
	} catch (error) {
		showError(
			error,
			i18n.baseText(
				isEdit.value
					? 'settings.workflowAuthoringChecks.updateError'
					: 'settings.workflowAuthoringChecks.createError',
			),
		);
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<Modal
		width="560px"
		:name="WORKFLOW_AUTHORING_CHECK_FORM_MODAL_KEY"
		:title="modalTitle"
		:event-bus="modalBus"
		:center="true"
	>
		<template #content>
			<div :class="$style.form" data-test-id="workflow-authoring-check-form">
				<N8nInputLabel
					:label="i18n.baseText('settings.workflowAuthoringChecks.modal.field.name')"
					color="text-dark"
				>
					<div
						v-if="isStatic"
						:class="$style.staticField"
						data-test-id="workflow-authoring-check-form-name-static"
					>
						{{ name }}
					</div>
					<N8nInput
						v-else
						v-model="name"
						size="large"
						:placeholder="
							i18n.baseText('settings.workflowAuthoringChecks.modal.field.name.placeholder')
						"
						:maxlength="128"
						data-test-id="workflow-authoring-check-form-name"
					/>
				</N8nInputLabel>

				<N8nInputLabel
					v-if="!isStatic"
					:label="i18n.baseText('settings.workflowAuthoringChecks.modal.field.type')"
					color="text-dark"
				>
					<N8nSelect
						v-model="typeKey"
						:disabled="isEdit"
						data-test-id="workflow-authoring-check-form-type"
					>
						<N8nOption v-for="t in store.types" :key="t.type" :value="t.type" :label="t.title" />
					</N8nSelect>
				</N8nInputLabel>

				<template v-if="!isStatic">
					<N8nInputLabel
						v-for="field in typeFields"
						:key="field.name"
						:label="field.label"
						color="text-dark"
					>
						<N8nSelect
							v-if="field.kind === 'nodeType'"
							v-model="config[field.name]"
							filterable
							:filter-method="(query: string) => onNodeTypeFilter(field.name, query)"
							:placeholder="field.placeholder"
							:data-test-id="`workflow-authoring-check-form-field-${field.name}`"
						>
							<N8nOption
								v-for="option in filteredNodeTypeOptions(field.name)"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
						<N8nInput
							v-else
							v-model="config[field.name]"
							:placeholder="field.placeholder"
							:data-test-id="`workflow-authoring-check-form-field-${field.name}`"
						/>
					</N8nInputLabel>
				</template>

				<N8nInputLabel
					:label="i18n.baseText('settings.workflowAuthoringChecks.modal.field.severity')"
					color="text-dark"
				>
					<N8nSelect v-model="severity" data-test-id="workflow-authoring-check-form-severity">
						<N8nOption
							value="warning"
							:label="i18n.baseText('workflowAuthoringChecks.severity.warning')"
						/>
						<N8nOption
							value="blocking"
							:label="i18n.baseText('workflowAuthoringChecks.severity.blocking')"
						/>
					</N8nSelect>
				</N8nInputLabel>

				<div :class="$style.enabledRow">
					<span>{{ i18n.baseText('settings.workflowAuthoringChecks.modal.field.enabled') }}</span>
					<ElSwitch
						v-model="enabled"
						size="large"
						data-test-id="workflow-authoring-check-form-enabled"
					/>
				</div>

				<div
					v-if="validationError"
					:class="$style.validationError"
					data-test-id="workflow-authoring-check-form-error"
				>
					{{ validationError }}
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('settings.workflowAuthoringChecks.modal.cancel')"
					data-test-id="workflow-authoring-check-form-cancel"
					@click="closeModal"
				/>
				<N8nButton
					:loading="submitting"
					:label="i18n.baseText('settings.workflowAuthoringChecks.modal.save')"
					data-test-id="workflow-authoring-check-form-save"
					@click="onSubmit"
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

.enabledRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.validationError {
	color: var(--color--text--danger);
	font-size: var(--font-size--2xs);
}

.staticField {
	color: var(--color--text);
	font-size: var(--font-size--sm);
	padding: var(--spacing--2xs) 0;
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
