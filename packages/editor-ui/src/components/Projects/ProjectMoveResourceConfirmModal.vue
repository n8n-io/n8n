<script lang="ts" setup>
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { useProjectsStore } from '@/stores/projects.store';
import Modal from '@/components/Modal.vue';

const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb | ICredentialsResponse;
		resourceType: ReturnType<typeof i18n.baseText>;
		projectId: string;
		beforeClose: () => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const confirm = async () => {
	await projectsStore.moveResourceToProject(props.data.resource.id, props.data.projectId);
	closeModal();
};
</script>
<template>
	<Modal width="500px" :name="props.modalName" :before-close="props.data.beforeClose">
		<template #header>
			<N8nHeading tag="h2" size="xlarge" class="mb-m">
				{{ i18n.baseText('projects.move.resource.confirm.modal.title') }}
			</N8nHeading>
		</template>
		<template #content> </template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton type="secondary" text class="mr-2xs" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="primary" @click="confirm">
					{{ i18n.baseText('projects.move.resource.confirm.modal.button.confirm') }}
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
