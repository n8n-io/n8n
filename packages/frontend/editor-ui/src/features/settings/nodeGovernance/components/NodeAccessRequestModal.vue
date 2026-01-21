<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

import {
	N8nButton,
	N8nInput,
	N8nSelect,
	N8nOption,
	N8nText,
	N8nBadge,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import { NODE_ACCESS_REQUEST_MODAL_KEY } from '../nodeGovernance.constants';

interface ModalData {
	nodeType?: string;
	displayName?: string;
}

const props = defineProps<{
	modalName: string;
	data: ModalData;
}>();

const { showError, showMessage } = useToast();
const i18n = useI18n();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const loading = ref(false);
const projectId = ref('');
const justification = ref('');
const workflowName = ref('');

const nodeType = computed(() => props.data?.nodeType ?? '');
const displayName = computed(() => props.data?.displayName ?? nodeType.value);

const projects = computed(() => projectsStore.myProjects ?? []);
const currentWorkflowName = computed(() => workflowsStore.workflowName);

onMounted(() => {
	// Pre-fill with current workflow name if available
	if (currentWorkflowName.value) {
		workflowName.value = currentWorkflowName.value;
	}
});

async function onSubmit() {
	if (!projectId.value || !justification.value.trim()) {
		showError(
			new Error(i18n.baseText('nodeGovernance.accessRequest.validation.required')),
			i18n.baseText('nodeGovernance.accessRequest.validation.error'),
		);
		return;
	}

	if (justification.value.length < 10) {
		showError(
			new Error(i18n.baseText('nodeGovernance.accessRequest.validation.justificationLength')),
			i18n.baseText('nodeGovernance.accessRequest.validation.error'),
		);
		return;
	}

	loading.value = true;

	try {
		const result = await nodeGovernanceStore.createAccessRequest({
			projectId: projectId.value,
			nodeType: nodeType.value,
			justification: justification.value,
			workflowName: workflowName.value || undefined,
		});

		if (result.alreadyExists) {
			showMessage({
				title: i18n.baseText('nodeGovernance.accessRequest.alreadyExists.title'),
				message: i18n.baseText('nodeGovernance.accessRequest.alreadyExists.message'),
				type: 'warning',
			});
		} else {
			showMessage({
				title: i18n.baseText('nodeGovernance.accessRequest.success.title'),
				message: i18n.baseText('nodeGovernance.accessRequest.success.message'),
				type: 'success',
			});
		}

		onClose();
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.accessRequest.error'));
	} finally {
		loading.value = false;
	}
}

function onClose() {
	projectId.value = '';
	justification.value = '';
	workflowName.value = currentWorkflowName.value ?? '';
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('nodeGovernance.accessRequest.title')"
		:show-close="true"
		:center="true"
		width="500px"
	>
		<template #content>
			<div :class="$style.content">
				<div :class="$style.nodeInfo">
					<N8nText tag="p" size="medium">
						{{ i18n.baseText('nodeGovernance.accessRequest.requestingFor') }}
					</N8nText>
					<N8nText tag="p" size="large" :bold="true">
						{{ displayName }}
					</N8nText>
					<N8nBadge type="danger">
						{{ i18n.baseText('nodeCreator.nodeItem.blocked') }}
					</N8nBadge>
				</div>

				<div :class="$style.form">
					<div :class="$style.field">
						<label :class="$style.label">
							{{ i18n.baseText('nodeGovernance.accessRequest.project') }} *
						</label>
						<N8nSelect
							v-model="projectId"
							:class="$style.input"
							:placeholder="i18n.baseText('nodeGovernance.accessRequest.selectProject')"
						>
							<N8nOption
								v-for="project in projects"
								:key="project.id"
								:value="project.id"
								:label="project.name"
							/>
						</N8nSelect>
					</div>

					<div :class="$style.field">
						<label :class="$style.label">
							{{ i18n.baseText('nodeGovernance.accessRequest.workflowName') }}
						</label>
						<N8nInput
							v-model="workflowName"
							:class="$style.input"
							:placeholder="i18n.baseText('nodeGovernance.accessRequest.workflowNamePlaceholder')"
						/>
					</div>

					<div :class="$style.field">
						<label :class="$style.label">
							{{ i18n.baseText('nodeGovernance.accessRequest.justification') }} *
						</label>
						<N8nInput
							v-model="justification"
							:class="$style.input"
							type="textarea"
							:rows="4"
							:placeholder="i18n.baseText('nodeGovernance.accessRequest.justificationPlaceholder')"
						/>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('nodeGovernance.accessRequest.justificationHint') }}
						</N8nText>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="onClose">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton :loading="loading" @click="onSubmit">
					{{ i18n.baseText('nodeGovernance.accessRequest.submit') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
}

.nodeInfo {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-xs);
	padding: var(--spacing-m);
	background: var(--color-background-light);
	border-radius: var(--border-radius-base);
	text-align: center;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
}

.input {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-xs);
}
</style>
