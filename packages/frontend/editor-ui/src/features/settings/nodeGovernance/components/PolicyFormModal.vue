<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { storeToRefs } from 'pinia';

import { N8nButton, N8nInput, N8nSelect, N8nOption, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import { POLICY_FORM_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const { categories } = storeToRefs(nodeGovernanceStore);

const loading = ref(false);

const policyType = ref<'allow' | 'block'>('block');
const scope = ref<'global' | 'projects'>('global');
const targetType = ref<'node' | 'category'>('node');
const targetValue = ref('');
const projectIds = ref<string[]>([]);

const modalState = computed(() => uiStore.modalsById[POLICY_FORM_MODAL_KEY]);
const isOpen = computed(() => modalState.value?.open ?? false);
const modalData = computed(() => modalState.value?.data ?? {});
const isEdit = computed(() => modalData.value.policy !== undefined);
const modalTitle = computed(() =>
	isEdit.value
		? i18n.baseText('nodeGovernance.policies.edit.title')
		: i18n.baseText('nodeGovernance.policies.create.title'),
);

const projects = computed(() => projectsStore.myProjects ?? []);

// Watch when modal opens and populate form data
// Use immediate: true because the component is only mounted when the modal is already open
// (due to v-if in ModalRoot), so we need to run on mount, not just on changes
watch(
	isOpen,
	(nowOpen, wasOpen) => {
		if (nowOpen && !wasOpen) {
			// Modal just opened - populate form from data
			const policy = modalData.value.policy;
			if (policy) {
				policyType.value = policy.policyType ?? 'block';
				scope.value = policy.scope ?? 'global';
				targetType.value = policy.targetType ?? 'node';
				targetValue.value = policy.targetValue ?? '';
				projectIds.value =
					policy.projectAssignments?.map((a: { projectId: string }) => a.projectId) ?? [];
			} else {
				resetForm();
			}
		}
	},
	{ immediate: true },
);

function resetForm() {
	policyType.value = 'block';
	scope.value = 'global';
	targetType.value = 'node';
	targetValue.value = '';
	projectIds.value = [];
}

async function onSubmit() {
	if (!targetValue.value.trim()) {
		showError(
			new Error(i18n.baseText('nodeGovernance.policies.validation.targetValue')),
			i18n.baseText('nodeGovernance.policies.validation.error'),
		);
		return;
	}

	if (scope.value === 'projects' && projectIds.value.length === 0) {
		showError(
			new Error('Please select at least one project'),
			i18n.baseText('nodeGovernance.policies.validation.error'),
		);
		return;
	}

	loading.value = true;

	try {
		if (isEdit.value && modalData.value.policy) {
			await nodeGovernanceStore.updatePolicy(modalData.value.policy.id, {
				policyType: policyType.value,
				scope: scope.value,
				targetType: targetType.value,
				targetValue: targetValue.value,
				projectIds: scope.value === 'projects' ? projectIds.value : [],
			});
			showMessage({
				title: i18n.baseText('nodeGovernance.policies.update.success'),
				type: 'success',
			});
		} else {
			await nodeGovernanceStore.createPolicy({
				policyType: policyType.value,
				scope: scope.value,
				targetType: targetType.value,
				targetValue: targetValue.value,
				projectIds: scope.value === 'projects' ? projectIds.value : undefined,
			});
			showMessage({
				title: i18n.baseText('nodeGovernance.policies.create.success'),
				type: 'success',
			});
		}
		closeModal();
	} catch (e) {
		showError(
			e,
			isEdit.value
				? i18n.baseText('nodeGovernance.policies.update.error')
				: i18n.baseText('nodeGovernance.policies.create.error'),
		);
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(POLICY_FORM_MODAL_KEY);
}
</script>

<template>
	<Modal
		:name="POLICY_FORM_MODAL_KEY"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		width="500px"
	>
		<template #content>
			<div :class="$style.form">
				<div :class="$style.field">
					<label :class="$style.label">Policy Type</label>
					<N8nSelect v-model="policyType" :class="$style.select">
						<N8nOption value="block" label="Block" />
						<N8nOption value="allow" label="Allow" />
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">Scope</label>
					<N8nSelect v-model="scope" :class="$style.select">
						<N8nOption value="global" label="Global" />
						<N8nOption value="projects" label="Specific Projects" />
					</N8nSelect>
				</div>

				<!-- Project selector - only show when scope is 'projects' -->
				<div v-if="scope === 'projects'" :class="$style.field">
					<label :class="$style.label">Projects</label>
					<N8nSelect
						v-model="projectIds"
						:class="$style.select"
						multiple
						placeholder="Select projects..."
					>
						<N8nOption
							v-for="project in projects"
							:key="project.id"
							:value="project.id"
							:label="project.name"
						/>
					</N8nSelect>
					<N8nText v-if="projectIds.length === 0" size="small" color="text-light">
						Select one or more projects for this policy.
					</N8nText>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">Target Type</label>
					<N8nSelect v-model="targetType" :class="$style.select">
						<N8nOption value="node" label="Node" />
						<N8nOption value="category" label="Category" />
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">Target Value</label>
					<!-- Category selector when targetType is 'category' -->
					<N8nSelect
						v-if="targetType === 'category'"
						v-model="targetValue"
						:class="$style.select"
						placeholder="Select a category..."
					>
						<N8nOption
							v-for="cat in categories"
							:key="cat.id"
							:value="cat.slug"
							:label="cat.displayName"
						/>
					</N8nSelect>
					<!-- Node type input when targetType is 'node' -->
					<N8nInput
						v-else
						v-model="targetValue"
						:class="$style.input"
						placeholder="e.g., n8n-nodes-base.httpRequest"
					/>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="closeModal"> Cancel </N8nButton>
				<N8nButton :loading="loading" @click="onSubmit">
					{{ isEdit ? 'Save' : 'Create' }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.label {
	font-weight: 500;
	font-size: 13px;
	color: var(--color--text--shade-1);
}

.select,
.input {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
</style>
