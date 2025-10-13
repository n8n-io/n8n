<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectPages } from '@/features/projects/composables/useProjectPages';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useFoldersStore } from '@/features/folders/folders.store';
import { useToast } from '@/composables/useToast';
import { useReadyToRunWorkflowsV2Store } from '../stores/readyToRunWorkflowsV2.store';

const props = defineProps<{
	hasActiveCallouts?: boolean;
}>();

const route = useRoute();
const i18n = useI18n();
const toast = useToast();
const projectPages = useProjectPages();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const foldersStore = useFoldersStore();
const readyToRunWorkflowsV2Store = useReadyToRunWorkflowsV2Store();

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
	);
});

const showButton = computed(() => {
	return (
		readyToRunWorkflowsV2Store.getButtonVisibility(
			foldersStore.totalWorkflowCount > 0, // Has workflows
			projectPermissions.value.workflow.create,
			sourceControlStore.preferences.branchReadOnly,
		) && !props.hasActiveCallouts // Hide when callouts are shown
	);
});

const handleClick = async () => {
	const projectId = projectPages.isOverviewSubPage
		? projectsStore.personalProject?.id
		: (route.params.projectId as string);

	try {
		await readyToRunWorkflowsV2Store.claimCreditsAndOpenWorkflow(
			'button',
			route.params.folderId as string,
			projectId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.error'));
	}
};
</script>

<template>
	<N8nButton
		v-if="showButton"
		data-test-id="ready-to-run-v2-button"
		type="secondary"
		icon="sparkles"
		:loading="readyToRunWorkflowsV2Store.claimingCredits"
		:disabled="
			sourceControlStore.preferences.branchReadOnly || readyToRunWorkflowsV2Store.claimingCredits
		"
		@click="handleClick"
	>
		{{ i18n.baseText('workflows.empty.readyToRunV2') }}
	</N8nButton>
</template>
