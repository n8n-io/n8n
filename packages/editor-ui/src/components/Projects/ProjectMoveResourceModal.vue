<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { useProjectsStore } from '@/stores/projects.store';
import Modal from '@/components/Modal.vue';
import { PROJECT_MOVE_RESOURCE_CONFIRM_MODAL } from '@/constants';
import type { ResourceType } from '@/utils/projects.utils';
import { splitName } from '@/utils/projects.utils';
import { useTelemetry } from '@/composables/useTelemetry';

const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb | ICredentialsResponse;
		resourceType: ResourceType;
		resourceTypeLabel: string;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();

const projectId = ref<string | null>(null);
const processedName = computed(() => {
	const { firstName, lastName, email } = splitName(props.data.resource.homeProject?.name ?? '');
	return !firstName ? email : `${firstName}${lastName ? ' ' + lastName : ''}`;
});
const availableProjects = computed(() => {
	return projectsStore.teamProjects.filter((p) => p.id !== props.data.resource.homeProject?.id);
});

const updateProject = (value: string) => {
	projectId.value = value;
};

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const next = () => {
	closeModal();
	uiStore.openModalWithData({
		name: PROJECT_MOVE_RESOURCE_CONFIRM_MODAL,
		data: {
			resource: props.data.resource,
			resourceType: props.data.resourceType,
			resourceTypeLabel: props.data.resourceTypeLabel,
			projectId: projectId.value,
			projectName: availableProjects.value.find((p) => p.id === projectId.value)?.name ?? '',
		},
	});
};

onMounted(() => {
	telemetry.track(`User clicked to move a ${props.data.resourceType}`, {
		[`${props.data.resourceType}_id`]: props.data.resource.id,
		project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
	});
});
</script>
<template>
	<Modal width="500px" :name="props.modalName" data-test-id="project-move-resource-modal">
		<template #header>
			<N8nHeading tag="h2" size="xlarge" class="mb-m">
				{{
					i18n.baseText('projects.move.resource.modal.title', {
						interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
					})
				}}
			</N8nHeading>
			<N8nText>
				<i18n-t keypath="projects.move.resource.modal.message">
					<template #resourceName
						><strong>{{ props.data.resource.name }}</strong></template
					>
					<template #resourceHomeProjectName>{{ processedName }}</template>
					<template #resourceTypeLabel>{{ props.data.resourceTypeLabel }}</template>
				</i18n-t>
			</N8nText>
		</template>
		<template #content>
			<div>
				<N8nSelect
					class="mr-2xs"
					:model-value="projectId"
					size="small"
					data-test-id="project-move-resource-modal-select"
					@update:model-value="updateProject"
				>
					<N8nOption
						v-for="p in availableProjects"
						:key="p.id"
						:value="p.id"
						:label="p.name"
					></N8nOption>
				</N8nSelect>
			</div>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton type="secondary" text class="mr-2xs" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton :disabled="!projectId" type="primary" @click="next">
					{{ i18n.baseText('generic.next') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	justify-content: flex-end;
}
</style>
