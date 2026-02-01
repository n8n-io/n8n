<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { Project, ProjectListItem, ProjectSharingData } from '../projects.types';
import ProjectSharing from './ProjectSharing.vue';
import { useI18n } from '@n8n/i18n';
import type { ResourceCounts } from '../projects.store';

import { ElDialog, ElRadio } from 'element-plus';
import { N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
type Props = {
	currentProject: Project | null;
	projects: ProjectListItem[];
	resourceCounts: ResourceCounts;
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();
const emit = defineEmits<{
	confirmDelete: [value?: string];
}>();

const locale = useI18n();

const selectedProject = ref<ProjectSharingData | null>(null);
const operation = ref<'transfer' | 'wipe' | null>(null);
const wipeConfirmText = ref('');
const hasMovableResources = computed(
	() =>
		props.resourceCounts.credentials +
			props.resourceCounts.workflows +
			props.resourceCounts.dataTables >
		0,
);
const isValid = computed(() => {
	const expectedWipeConfirmation = locale.baseText(
		'projects.settings.delete.question.wipe.placeholder',
	);

	return (
		!hasMovableResources.value ||
		(operation.value === 'transfer' && !!selectedProject.value) ||
		(operation.value === 'wipe' && wipeConfirmText.value === expectedWipeConfirmation)
	);
});

const onDelete = () => {
	if (!isValid.value) {
		return;
	}

	if (operation.value === 'wipe') {
		selectedProject.value = null;
	}

	emit('confirmDelete', selectedProject.value?.id);
};
</script>
<template>
	<ElDialog
		v-model="visible"
		:title="
			locale.baseText('projects.settings.delete.title', {
				interpolate: { projectName: props.currentProject?.name ?? '' },
			})
		"
		width="650"
	>
		<N8nText v-if="!hasMovableResources" color="text-base">{{
			locale.baseText('projects.settings.delete.message.empty')
		}}</N8nText>
		<div v-else-if="hasMovableResources">
			<N8nText color="text-base">{{ locale.baseText('projects.settings.delete.message') }}</N8nText>
			<div class="pt-l">
				<ElRadio
					:model-value="operation ?? ''"
					label="transfer"
					class="mb-s"
					@update:model-value="operation = 'transfer'"
				>
					<N8nText color="text-dark">{{
						locale.baseText('projects.settings.delete.question.transfer.label')
					}}</N8nText>
				</ElRadio>
				<div v-if="operation === 'transfer'" :class="$style.operation">
					<N8nText color="text-dark">{{
						locale.baseText('projects.settings.delete.question.transfer.title')
					}}</N8nText>
					<ProjectSharing
						v-model="selectedProject"
						class="pt-2xs"
						:projects="props.projects"
						:empty-options-text="locale.baseText('projects.sharing.noMatchingProjects')"
					/>
				</div>

				<ElRadio
					:model-value="operation ?? ''"
					label="wipe"
					class="mb-s"
					@update:model-value="operation = 'wipe'"
				>
					<N8nText color="text-dark">{{
						locale.baseText('projects.settings.delete.question.wipe.label')
					}}</N8nText>
				</ElRadio>
				<div v-if="operation === 'wipe'" :class="$style.operation">
					<N8nInputLabel :label="locale.baseText('projects.settings.delete.question.wipe.title')">
						<N8nInput
							v-model="wipeConfirmText"
							data-test-id="project-delete-confirm-input"
							:placeholder="locale.baseText('projects.settings.delete.question.wipe.placeholder')"
						/>
					</N8nInputLabel>
				</div>
			</div>
		</div>
		<template #footer>
			<N8nButton
				type="danger"
				native-type="button"
				:disabled="!isValid"
				data-test-id="project-settings-delete-confirm-button"
				@click.stop.prevent="onDelete"
				>{{ locale.baseText('projects.settings.danger.deleteProject') }}</N8nButton
			>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.operation {
	padding: 0 0 var(--spacing--lg) var(--spacing--lg);
}
</style>
