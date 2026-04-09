import { h } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { ResourceType } from '../projects.utils';
import type { ProjectSharingData } from '../projects.types';
import ProjectMoveSuccessToastMessage from '../components/ProjectMoveSuccessToastMessage.vue';

interface ShowMoveToProjectToastOptions {
	resourceType: Exclude<ResourceType, 'dataTable'>;
	resourceTypeLabel: string;
	resourceName: string;
	targetProject: ProjectSharingData;
	targetProjectName: string;
	destinationFolderId?: string;
	shareUsedCredentials: boolean;
	areAllUsedCredentialsShareable: boolean;
}

export function useMoveResourceToProjectToast() {
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();

	function showMoveToProjectToast(options: ShowMoveToProjectToastOptions) {
		const isWorkflow = options.resourceType === ResourceType.Workflow;
		const viewName = isWorkflow ? VIEWS.PROJECTS_WORKFLOWS : VIEWS.PROJECTS_CREDENTIALS;

		toast.showToast({
			title: i18n.baseText('projects.move.resource.success.title', {
				interpolate: {
					resourceTypeLabel: options.resourceTypeLabel,
					resourceName: options.resourceName,
					targetProjectName: options.targetProjectName,
				},
			}),
			message: h(ProjectMoveSuccessToastMessage, {
				routeName: viewName,
				resourceType: options.resourceType,
				targetProject: options.targetProject,
				isShareCredentialsChecked: options.shareUsedCredentials,
				areAllUsedCredentialsShareable: options.areAllUsedCredentialsShareable,
			}),
			onClick: (event: MouseEvent | undefined) => {
				if (event?.target instanceof HTMLAnchorElement) {
					event.preventDefault();
					void router.push(
						options.destinationFolderId
							? {
									name: VIEWS.PROJECTS_FOLDERS,
									params: {
										projectId: options.targetProject.id,
										folderId: options.destinationFolderId,
									},
								}
							: {
									name: viewName,
									params: { projectId: options.targetProject.id },
								},
					);
				}
			},
			type: 'success',
			duration: 8000,
		});
	}

	return { showMoveToProjectToast };
}
