import { onMounted, ref, watch } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useFoldersStore } from '@/stores/folders.store';
import type {
	TreeItemType,
	FolderItem,
	WorkflowItem,
} from '@n8n/design-system/components/N8nSidebar';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { IWorkflowDb } from '@/Interface';
import type { ProjectListItem } from '@/types/projects.types';

export const useSidebarData = () => {
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();
	const foldersStore = useFoldersStore();

	// Ensure data is loaded
	onMounted(async () => {
		// Projects should already be loaded by the app
		// Workflows might need to be fetched if not already loaded
		if (workflowsStore.allWorkflows.length === 0) {
			await workflowsStore.fetchAllWorkflows();
		}
		// Load all sidebar data
		await loadAllData();
	});

	// Watch for changes in workflows and projects to reload data
	watch(
		() => [workflowsStore.allWorkflows, projectsStore.myProjects, projectsStore.personalProject],
		async () => {
			await loadAllData();
		},
		{ deep: true },
	);

	// Helper function to convert a workflow to TreeItemType
	const workflowToTreeItem = (workflow: IWorkflowDb): WorkflowItem => ({
		id: workflow.id,
		label: workflow.name,
		type: 'workflow' as const,
	});

	// Helper function to organize workflows into folders
	const organizeIntoFolders = async (
		workflows: IWorkflowDb[],
		projectId: string,
	): Promise<TreeItemType[]> => {
		const folderMap = new Map<string, FolderItem>();
		const rootItems: TreeItemType[] = [];

		// Fetch all folders for this project to ensure we include empty folders
		let allFolders: any[] = [];
		try {
			const foldersResponse = await foldersStore.fetchProjectFolders(projectId);
			allFolders = foldersResponse.data || [];
			console.log(`Fetched ${allFolders.length} folders for project ${projectId}:`, allFolders);
		} catch (error) {
			console.warn('Failed to fetch project folders:', error);
			// Fall back to folders found in workflows
			allFolders = [];
		}

		// Create folder items from all folders (including empty ones)
		allFolders.forEach((folder) => {
			const folderItem: FolderItem = {
				id: folder.id,
				label: folder.name,
				type: 'folder',
				children: [],
			};
			folderMap.set(folder.id, folderItem);
		});

		// Also add folders found in workflows (in case fetchProjectFolders didn't work)
		workflows.forEach((workflow) => {
			if (workflow.parentFolder && !folderMap.has(workflow.parentFolder.id)) {
				const folderItem: FolderItem = {
					id: workflow.parentFolder.id,
					label: workflow.parentFolder.name,
					type: 'folder',
					children: [],
				};
				folderMap.set(workflow.parentFolder.id, folderItem);
			}
		});

		// Group workflows by their parent folder and add them to folders
		const workflowsByFolder = new Map<string | null, IWorkflowDb[]>();
		workflows.forEach((workflow) => {
			const folderId = workflow.parentFolder?.id || null;
			if (!workflowsByFolder.has(folderId)) {
				workflowsByFolder.set(folderId, []);
			}
			workflowsByFolder.get(folderId)!.push(workflow);
		});

		// Add workflows to their folders
		workflowsByFolder.forEach((folderWorkflows, folderId) => {
			const workflowItems = folderWorkflows.map(workflowToTreeItem);

			if (folderId && folderMap.has(folderId)) {
				const folder = folderMap.get(folderId)!;
				folder.children = [...(folder.children || []), ...workflowItems];
			} else {
				// Workflows without folders go to root
				rootItems.push(...workflowItems);
			}
		});

		// Build folder hierarchy using the folder data from API
		// First, let's organize folders by their parent relationship
		const rootFolderIds = new Set<string>();
		const childFoldersByParent = new Map<string, string[]>();

		// Organize folders into parent-child relationships
		allFolders.forEach((folder) => {
			const parentId = folder.parentFolder?.id;
			if (parentId) {
				// This folder has a parent
				if (!childFoldersByParent.has(parentId)) {
					childFoldersByParent.set(parentId, []);
				}
				childFoldersByParent.get(parentId)!.push(folder.id);
			} else {
				// This is a root folder
				rootFolderIds.add(folder.id);
			}
		});

		// Recursive function to build folder hierarchy
		const buildFolderTree = (folderId: string): FolderItem | null => {
			const folder = folderMap.get(folderId);
			if (!folder) return null;

			// Get all child folder IDs for this folder
			const childFolderIds = childFoldersByParent.get(folderId) || [];

			// Recursively build child folders
			const childFolders = childFolderIds
				.map(buildFolderTree)
				.filter((child): child is FolderItem => child !== null);

			// Add child folders to this folder's children (preserving existing workflows)
			folder.children = [...(folder.children || []), ...childFolders];

			// Sort children: folders first, then workflows, both alphabetically
			folder.children.sort((a, b) => {
				if (a.type === 'folder' && b.type === 'workflow') return -1;
				if (a.type === 'workflow' && b.type === 'folder') return 1;
				return a.label.localeCompare(b.label);
			});

			return folder;
		};

		// Process all root folders and build their hierarchies
		rootFolderIds.forEach((rootFolderId) => {
			const rootFolder = buildFolderTree(rootFolderId);
			if (rootFolder) {
				rootItems.push(rootFolder);
			}
		});

		// Sort items: folders first, then workflows
		const sortedItems = rootItems.sort((a, b) => {
			if (a.type === 'folder' && b.type === 'workflow') return -1;
			if (a.type === 'workflow' && b.type === 'folder') return 1;
			return a.label.localeCompare(b.label);
		});

		console.log(
			`Final tree structure for project ${projectId}:`,
			JSON.stringify(sortedItems, null, 2),
		);
		return sortedItems;
	};

	// Reactive data
	const personalItems = ref<{ id: string; items: TreeItemType[] }>({ id: '', items: [] });
	const sharedItems = ref<TreeItemType[]>([]);
	const projects = ref<{ id: string; title: string; icon: IconName; items: TreeItemType[] }[]>([]);

	// Function to load personal items
	const loadPersonalItems = async () => {
		const personalProjectId = projectsStore.personalProject?.id;
		if (!personalProjectId) {
			personalItems.value = { id: '', items: [] };
			return;
		}

		const personalWorkflows = workflowsStore.allWorkflows.filter(
			(workflow) => workflow.homeProject?.id === personalProjectId,
		);

		const items = await organizeIntoFolders(personalWorkflows, personalProjectId);
		personalItems.value = { id: personalProjectId, items };
	};

	// Function to load shared items
	const loadSharedItems = async () => {
		const personalProjectId = projectsStore.personalProject?.id;

		// Filter workflows that are shared with the user
		const sharedWorkflows = workflowsStore.allWorkflows.filter((workflow) => {
			// Skip workflows in personal project
			if (workflow.homeProject?.id === personalProjectId) return false;

			// Skip workflows in team projects (they'll appear under projects)
			const isInTeamProject = projectsStore.myProjects.some(
				(project) => project.type === 'team' && project.id === workflow.homeProject?.id,
			);
			if (isInTeamProject) return false;

			return true;
		});

		// For shared items, we don't have a specific project ID, so we'll use a generic approach
		// This might need to be refined based on how shared folders work
		const items = await organizeIntoFolders(sharedWorkflows, personalProjectId || '');
		sharedItems.value = items;
	};

	// Function to load projects
	const loadProjects = async () => {
		const teamProjects = projectsStore.myProjects.filter((project) => project.type === 'team');

		const projectsData = await Promise.all(
			teamProjects.map(async (project: ProjectListItem) => {
				// Get workflows for this project
				const projectWorkflows = workflowsStore.allWorkflows.filter(
					(workflow) => workflow.homeProject?.id === project.id,
				);

				// Organize project workflows into folders
				const items = await organizeIntoFolders(projectWorkflows, project.id);

				return {
					id: project.id,
					title: project.name || 'Project',
					icon: (project.icon?.value || 'folder') as IconName,
					items,
				};
			}),
		);

		projects.value = projectsData;
	};

	// Function to load all data
	const loadAllData = async () => {
		await Promise.all([loadPersonalItems(), loadSharedItems(), loadProjects()]);
	};

	return {
		personalItems,
		sharedItems,
		projects,
		loadAllData,
	};
};
