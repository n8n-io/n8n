<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { useReadyToRunStore } from '../stores/readyToRun.store';

const props = defineProps<{
	hasActiveCallouts?: boolean;
}>();

const route = useRoute();
const i18n = useI18n();
const projectPages = useProjectPages();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const foldersStore = useFoldersStore();
const readyToRunStore = useReadyToRunStore();

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
	);
});

const showButton = computed(() => {
	return (
		readyToRunStore.getButtonVisibility(
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
		await readyToRunStore.claimCreditsAndOpenWorkflow(
			'button',
			route.params.folderId as string,
			projectId,
		);
	} catch {
		// Error already shown by store functions
	}
};
</script>

<template>
	<N8nButton
		variant="subtle"
		v-if="showButton"
		data-test-id="ready-to-run-button"
		icon="zap"
		:loading="readyToRunStore.claimingCredits"
		:disabled="sourceControlStore.preferences.branchReadOnly || readyToRunStore.claimingCredits"
		@click="handleClick"
	>
		{{ i18n.baseText('workflows.empty.readyToRun') }}
	</N8nButton>
</template>
