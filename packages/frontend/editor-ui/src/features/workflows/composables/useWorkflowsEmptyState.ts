import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useCredentialsAppSelectionStore } from '@/experiments/credentialsAppSelection/stores/credentialsAppSelection.store';
import { getResourcePermissions } from '@n8n/permissions';

/**
 * Composable for managing workflows empty state display logic.
 * Handles heading, description, and permission-based visibility
 * for the empty state when no workflows exist.
 */
export function useWorkflowsEmptyState() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const credentialsAppSelectionStore = useCredentialsAppSelectionStore();

	const personalProject = computed(() => projectsStore.personalProject);
	const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

	const projectPermissions = computed(() => {
		return getResourcePermissions(
			projectsStore.currentProject?.scopes ?? personalProject.value?.scopes,
		);
	});

	const canCreateWorkflow = computed(
		() => !readOnlyEnv.value && projectPermissions.value.workflow.create,
	);

	const showAppSelection = computed(() => {
		return (
			credentialsAppSelectionStore.isFeatureEnabled &&
			!readOnlyEnv.value &&
			projectPermissions.value.workflow.create
		);
	});

	const emptyStateHeading = computed(() => i18n.baseText('workflows.empty.onboarding.heading'));

	const emptyStateDescription = computed(() => {
		if (readOnlyEnv.value) {
			return i18n.baseText('workflows.empty.description.readOnlyEnv');
		} else if (!projectPermissions.value.workflow.create) {
			return i18n.baseText('workflows.empty.description.noPermission');
		}

		return '';
	});

	return {
		showAppSelection,
		emptyStateHeading,
		emptyStateDescription,
		canCreateWorkflow,
		readOnlyEnv,
		projectPermissions,
	};
}
