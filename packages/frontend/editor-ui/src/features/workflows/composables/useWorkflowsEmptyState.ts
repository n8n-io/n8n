import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useRecommendedTemplatesStore } from '@/features/workflows/templates/recommendations/recommendedTemplates.store';
import { useEmptyStateBuilderPromptStore } from '@/experiments/emptyStateBuilderPrompt/stores/emptyStateBuilderPrompt.store';
import { useCredentialsAppSelectionStore } from '@/experiments/credentialsAppSelection/stores/credentialsAppSelection.store';
import { getResourcePermissions } from '@n8n/permissions';
import type { IUser } from 'n8n-workflow';

/**
 * Composable for managing workflows empty state display logic.
 * Handles heading, description, and permission-based visibility
 * for the empty state when no workflows exist.
 */
export function useWorkflowsEmptyState() {
	const i18n = useI18n();
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const recommendedTemplatesStore = useRecommendedTemplatesStore();
	const emptyStateBuilderPromptStore = useEmptyStateBuilderPromptStore();
	const credentialsAppSelectionStore = useCredentialsAppSelectionStore();

	const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
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

	const showRecommendedTemplatesInline = computed(() => {
		return (
			recommendedTemplatesStore.isFeatureEnabled &&
			!readOnlyEnv.value &&
			projectPermissions.value.workflow.create
		);
	});

	const showBuilderPrompt = computed(() => {
		return (
			emptyStateBuilderPromptStore.isFeatureEnabled &&
			!readOnlyEnv.value &&
			projectPermissions.value.workflow.create
		);
	});

	const showAppSelection = computed(() => {
		return (
			credentialsAppSelectionStore.isFeatureEnabled &&
			!readOnlyEnv.value &&
			projectPermissions.value.workflow.create
		);
	});

	const builderHeading = computed(() => {
		const firstName = currentUser.value.firstName;
		if (firstName) {
			return i18n.baseText('workflows.empty.heading.builder', {
				interpolate: { name: firstName },
			});
		}
		return i18n.baseText('workflows.empty.heading.builder.userNotSetup');
	});

	const emptyStateHeading = computed(() => {
		const firstName = currentUser.value.firstName;

		if (showRecommendedTemplatesInline.value) {
			if (firstName) {
				return i18n.baseText('workflows.empty.heading', {
					interpolate: { name: firstName },
				});
			}
			return i18n.baseText('workflows.empty.heading.userNotSetup');
		} else {
			if (firstName) {
				return i18n.baseText('workflows.empty.headingWithIcon', {
					interpolate: { name: firstName },
				});
			}
			return i18n.baseText('workflows.empty.headingWithIcon.userNotSetup');
		}
	});

	const emptyStateDescription = computed(() => {
		if (readOnlyEnv.value) {
			return i18n.baseText('workflows.empty.description.readOnlyEnv');
		} else if (!projectPermissions.value.workflow.create) {
			return i18n.baseText('workflows.empty.description.noPermission');
		} else {
			return i18n.baseText('workflows.empty.description');
		}
	});

	return {
		showAppSelection,
		showBuilderPrompt,
		showRecommendedTemplatesInline,
		builderHeading,
		emptyStateHeading,
		emptyStateDescription,
		canCreateWorkflow,
		readOnlyEnv,
		projectPermissions,
	};
}
