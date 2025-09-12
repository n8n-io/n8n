<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectPages } from '@/composables/useProjectPages';
import { useProjectsStore } from '@/stores/projects.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useFoldersStore } from '@/stores/folders.store';
import { useReadyToRunWorkflowsV2Store } from '../stores/readyToRunWorkflowsV2.store';
import { VIEWS } from '@/constants';

const route = useRoute();
const i18n = useI18n();
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

const isWorkflowListView = (routeName: string) => {
	const WORKFLOWS_VIEWS: string[] = [
		VIEWS.PROJECTS_WORKFLOWS,
		VIEWS.WORKFLOWS,
		VIEWS.SHARED_WORKFLOWS,
		VIEWS.PROJECTS_FOLDERS,
	];
	return WORKFLOWS_VIEWS.includes(routeName);
};

const showButton = computed(() => {
	// Only show on workflow list views
	if (!isWorkflowListView(route.name?.toString() ?? '')) {
		return false;
	}

	return readyToRunWorkflowsV2Store.getButtonVisibility(
		foldersStore.totalWorkflowCount > 0, // Has workflows
		projectPermissions.value.workflow.create,
		sourceControlStore.preferences.branchReadOnly,
	);
});

const handleClick = async () => {
	const projectId = projectPages.isOverviewSubPage
		? projectsStore.personalProject?.id
		: (route.params.projectId as string);

	await readyToRunWorkflowsV2Store.claimCreditsAndOpenWorkflow(
		'button',
		route.params.folderId as string,
		projectId,
	);
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
