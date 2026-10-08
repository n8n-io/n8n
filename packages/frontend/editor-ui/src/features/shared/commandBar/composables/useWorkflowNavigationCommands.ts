import { computed, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { N8nIcon, isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { VIEWS } from '@/app/constants';
import type { IWorkflowDb, WorkflowListResource } from '@/Interface';
import { getWorkflowsAndFolders } from '@/app/api/workflows';
import type { FolderListItem } from '@/features/core/folders/folders.types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import type {
	CommandBarItem,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '../types';

const ITEM_ID = {
	CREATE_WORKFLOW: 'create-workflow',
};

const WORKFLOW_FIELDS = ['id', 'name', 'updatedAt', 'ownedBy', 'parentFolder'];

type LocatedResource = Pick<FolderListItem, 'homeProject' | 'parentFolder'>;

const isFolder = (resource: WorkflowListResource): resource is FolderListItem =>
	resource.resource === 'folder';

export function useWorkflowNavigationCommands(options: {
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { currentProjectName } = options;
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const projectsStore = useProjectsStore();
	const tagsStore = useTagsStore();
	const sourceControlStore = useSourceControlStore();

	const router = useRouter();
	const route = useRoute();

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	const nodeTypeNamesByDisplayName = computed(() => {
		const result = new Map<string, Set<string>>();
		for (const nodeType of nodeTypesStore.allNodeTypes) {
			const key = nodeType.displayName.toLowerCase();
			const names = result.get(key) ?? new Set<string>();
			names.add(nodeType.name);
			result.set(key, names);
		}
		return result;
	});

	const getProjectIcon = (resource: LocatedResource): IconOrEmoji => {
		if (resource.homeProject?.type === ProjectTypes.Personal) {
			return { type: 'icon', value: 'user' };
		}

		if (resource.homeProject?.name) {
			return isIconOrEmoji(resource.homeProject.icon)
				? resource.homeProject.icon
				: { type: 'icon', value: 'layers' };
		}

		return { type: 'icon', value: 'house' };
	};

	const getLocation = (resource: LocatedResource) => {
		const projectName =
			resource.homeProject?.type === ProjectTypes.Personal
				? i18n.baseText('projects.menu.personal')
				: resource.homeProject?.name;

		return [projectName, resource.parentFolder?.name].filter(Boolean).join(' / ');
	};

	const toFolderItem = (folder: FolderListItem): CommandBarItem => {
		const location = getLocation(folder);
		const route = folder.homeProject
			? {
					name: VIEWS.PROJECTS_FOLDERS,
					params: { projectId: folder.homeProject.id, folderId: folder.id },
				}
			: { name: VIEWS.FOLDERS, params: { folderId: folder.id } };

		return {
			id: `folder-${folder.id}`,
			title: folder.name,
			description: location,
			...(location ? { descriptionIcon: getProjectIcon(folder) } : {}),
			icon: { type: 'icon', value: 'folder' },
			timestamp: folder.updatedAt,
			href: router.resolve(route).href,
			handler: () => {
				void router.push(route);
			},
		};
	};

	async function searchFolders(query: string, limit: number): Promise<FolderListItem[]> {
		const { data } = await getWorkflowsAndFolders(
			rootStore.restApiContext,
			{ query, isArchived: false },
			{ skip: 0, take: limit, sortBy: 'updatedAt:desc' },
			true,
		);
		return data.filter(isFolder);
	}

	const toCommandBarItem = (workflow: IWorkflowDb, matchedNodeType?: string): CommandBarItem => {
		const nodeType = matchedNodeType ? nodeTypesStore.getNodeType(matchedNodeType) : null;
		const location = getLocation(workflow);
		const { href } = router.resolve({
			name: VIEWS.WORKFLOW,
			params: { workflowId: workflow.id },
		});

		return {
			id: workflow.id,
			title: workflow.name || i18n.baseText('commandBar.workflows.unnamed'),
			description: location,
			...(location ? { descriptionIcon: getProjectIcon(workflow) } : {}),
			icon: nodeType
				? { component: NodeIcon, props: { nodeType, size: 16 } }
				: { type: 'icon', value: 'workflow' },
			timestamp: workflow.updatedAt ? String(workflow.updatedAt) : undefined,
			href,
			handler: () => {
				window.location.href = href;
			},
		};
	};

	const findMatchedNodeType = (workflow: IWorkflowDb, nodeTypeNames: Set<string>) =>
		workflow.nodes?.find((node) => nodeTypeNames.has(node.type))?.type;

	async function search({
		query,
		offset,
		limit,
	}: CommandBarSearchRequest): Promise<CommandBarSearchResult> {
		const trimmed = query.trim();
		const lowerCased = trimmed.toLowerCase();
		const matchedNodeTypeNames = nodeTypeNamesByDisplayName.value.get(lowerCased);
		const matchedTag = tagsStore.allTags.find((tag) => tag.name.toLowerCase() === lowerCased);
		const listOptions = {
			sortBy: 'updatedAt:desc',
			includeScopes: false,
			skip: offset,
			take: limit + 1,
		};
		const includesFolders = offset === 0 && trimmed !== '' && settingsStore.isFoldersFeatureEnabled;

		const [folders, byName, byNodeType, byTag] = await Promise.all([
			includesFolders ? searchFolders(trimmed, limit) : Promise.resolve([]),
			workflowsListStore.searchWorkflows({
				query: trimmed || undefined,
				isArchived: false,
				select: WORKFLOW_FIELDS,
				options: listOptions,
			}),
			matchedNodeTypeNames
				? workflowsListStore.searchWorkflows({
						nodeTypes: [...matchedNodeTypeNames],
						isArchived: false,
						select: [...WORKFLOW_FIELDS, 'nodes'],
						options: listOptions,
					})
				: Promise.resolve([]),
			matchedTag
				? workflowsListStore.searchWorkflows({
						tags: [matchedTag.name],
						isArchived: false,
						select: WORKFLOW_FIELDS,
						options: listOptions,
					})
				: Promise.resolve([]),
		]);

		const items = new Map<string, CommandBarItem>();
		for (const folder of folders) {
			const item = toFolderItem(folder);
			items.set(item.id, item);
		}
		for (const workflow of byNodeType.slice(0, limit)) {
			const matchedNodeType = matchedNodeTypeNames
				? findMatchedNodeType(workflow, matchedNodeTypeNames)
				: undefined;
			items.set(workflow.id, toCommandBarItem(workflow, matchedNodeType));
		}
		for (const workflow of [...byTag.slice(0, limit), ...byName.slice(0, limit)]) {
			if (!items.has(workflow.id)) items.set(workflow.id, toCommandBarItem(workflow));
		}

		const updatedAt = (item: CommandBarItem) =>
			item.timestamp ? new Date(item.timestamp).getTime() : 0;

		return {
			items: [...items.values()].sort((a, b) => updatedAt(b) - updatedAt(a)),
			hasMore: [byName, byNodeType, byTag].some((page) => page.length > limit),
		};
	}

	const workflowNavigationCommands = computed<CommandBarItem[]>(() => {
		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).workflow.create;

		if (!hasCreatePermission) return [];

		return [
			{
				id: ITEM_ID.CREATE_WORKFLOW,
				title: i18n.baseText('commandBar.workflows.create', {
					interpolate: { projectName: currentProjectName.value },
				}),
				keywords: [i18n.baseText('workflows.add')],
				section: i18n.baseText('commandBar.sections.workflows'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'plus',
						color: 'text-light',
					},
				},
				handler: () => {
					const targetRoute = router.resolve({
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: projectsStore.currentProjectId,
							parentFolderId: route.params.folderId,
						},
					});
					window.location.href = targetRoute.fullPath;
				},
			},
		];
	});

	return {
		commands: workflowNavigationCommands,
		source: {
			id: 'workflows',
			title: i18n.baseText('commandBar.sections.workflows'),
			isRemote: true,
			isAvailable: () => workflowsStore.canViewWorkflows,
			search,
		},
		async initialize() {
			await tagsStore.fetchAll();
		},
	};
}
