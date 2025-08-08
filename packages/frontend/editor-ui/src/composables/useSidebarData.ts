import { computed, onMounted } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import type { TreeItemType } from '@n8n/design-system/components/N8nSidebar';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { IWorkflowDb } from '@/Interface';
import type { ProjectListItem } from '@/types/projects.types';

export const useSidebarData = () => {
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();

	// Ensure data is loaded
	onMounted(async () => {
		// Projects should already be loaded by the app
		// Workflows might need to be fetched if not already loaded
		if (workflowsStore.allWorkflows.length === 0) {
			await workflowsStore.fetchAllWorkflows();
		}
	});

	// Helper function to convert workflows to TreeItemType
	const workflowsToTreeItems = (workflows: IWorkflowDb[]): TreeItemType[] => {
		return workflows.map((workflow) => ({
			id: workflow.id,
			label: workflow.name,
			type: 'workflow' as const,
		}));
	};

	// Personal items - workflows in personal project
	const personalItems = computed<{ id: string; items: TreeItemType[] }>(() => {
		const personalProjectId = projectsStore.personalProject?.id;
		if (!personalProjectId) {
			return { id: '', items: [] };
		}

		const personalWorkflows = workflowsStore.allWorkflows.filter(
			(workflow) => workflow.homeProject?.id === personalProjectId,
		);

		// For now, return workflows directly
		// TODO: Add folder organization when folder data is available
		return { id: personalProjectId, items: workflowsToTreeItems(personalWorkflows) };
	});

	// Shared items - workflows shared with the current user
	const sharedItems = computed<TreeItemType[]>(() => {
		const personalProjectId = projectsStore.personalProject?.id;

		// Filter workflows that are shared with the user
		// A workflow is considered "shared" if:
		// 1. It's not in the personal project AND
		// 2. User has access to it (it appears in allWorkflows)
		const sharedWorkflows = workflowsStore.allWorkflows.filter((workflow) => {
			// Skip workflows in personal project
			if (workflow.homeProject?.id === personalProjectId) return false;

			// Skip workflows in team projects (they'll appear under projects)
			const isInTeamProject = projectsStore.myProjects.some(
				(project) => project.type === 'team' && project.id === workflow.homeProject?.id,
			);
			if (isInTeamProject) return false;

			// This workflow is shared with the user
			return true;
		});

		// TODO: Organize by sharing source when data is available
		return workflowsToTreeItems(sharedWorkflows);
	});

	// Projects - team projects with their workflows
	const projects = computed(() => {
		const teamProjects = projectsStore.myProjects.filter((project) => project.type === 'team');

		return teamProjects.map((project: ProjectListItem) => {
			// Get workflows for this project
			const projectWorkflows = workflowsStore.allWorkflows.filter(
				(workflow) => workflow.homeProject?.id === project.id,
			);

			// TODO: Add folder organization when folder data is available
			const items = workflowsToTreeItems(projectWorkflows);

			return {
				id: project.id,
				title: project.name || 'Project',
				icon: (project.icon || 'folder') as IconName,
				items,
			};
		});
	});

	return {
		personalItems,
		sharedItems,
		projects,
	};
};
