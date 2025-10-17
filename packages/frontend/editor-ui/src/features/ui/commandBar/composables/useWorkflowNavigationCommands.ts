import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ProjectTypes } from '@/features/projects/projects.types';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import debounce from 'lodash/debounce';
import { VIEWS } from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { CommandGroup, CommandBarItem } from '../types';
import { useTagsStore } from '@/stores/tags.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useFoldersStore } from '@/features/folders/folders.store';
import CommandBarItemTitle from '@/features/ui/commandBar/components/CommandBarItemTitle.vue';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import NodeIcon from '@/components/NodeIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';

const ITEM_ID = {
	CREATE_WORKFLOW: 'create-workflow',
	OPEN_WORKFLOW: 'open-workflow',
};

export function useWorkflowNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();
	const tagsStore = useTagsStore();
	const sourceControlStore = useSourceControlStore();
	const foldersStore = useFoldersStore();

	const router = useRouter();
	const route = useRoute();

	const { generateMergedNodesAndActions } = useActionsGenerator();

	const workflowResults = ref<IWorkflowDb[]>([]);
	const workflowKeywords = ref<Map<string, string[]>>(new Map());
	const workflowMatchedNodeTypes = ref<Map<string, string>>(new Map());
	const isLoading = ref(false);

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	function orderResultByCurrentProjectFirst<T extends IWorkflowDb>(results: T[]) {
		return results.sort((a, b) => {
			if (a.homeProject?.id === projectsStore.currentProjectId) return -1;
			if (b.homeProject?.id === projectsStore.currentProjectId) return 1;
			return 0;
		});
	}

	const fetchWorkflowsImpl = async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			const trimmedLower = trimmed.toLowerCase();

			// Find matching node types from available nodes
			const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
			const visibleNodeTypes = nodeTypesStore.allNodeTypes;
			const { mergedNodes } = generateMergedNodesAndActions(visibleNodeTypes, httpOnlyCredentials);
			const matchedNodes = mergedNodes.filter(
				(node) => node.displayName?.toLowerCase() === trimmedLower,
			);
			const matchedNodeTypeNames = Array.from(new Set(matchedNodes.map((node) => node.name)));

			// Check if search query matches any existing tag names
			const matchedTag = tagsStore.allTags.find((tag) => tag.name.toLowerCase() === trimmedLower);

			// Search workflows by name with minimal fields
			const nameSearchPromise = workflowsStore.searchWorkflows({
				name: trimmed,
				select: ['id', 'name', 'active', 'ownedBy', 'parentFolder', 'isArchived'],
			});

			const nodeTypeSearchPromise =
				matchedNodeTypeNames.length > 0
					? workflowsStore.searchWorkflows({
							nodeTypes: matchedNodeTypeNames,
							select: ['id', 'name', 'active', 'nodes', 'ownedBy', 'parentFolder', 'isArchived'],
						})
					: Promise.resolve([]);

			const tagSearchPromise = matchedTag
				? workflowsStore.searchWorkflows({
						tags: [matchedTag.name],
						select: ['id', 'name', 'active', 'ownedBy', 'tags', 'parentFolder', 'isArchived'],
					})
				: Promise.resolve([]);

			const [byName, byNodeTypes, byTags] = await Promise.all([
				nameSearchPromise,
				nodeTypeSearchPromise,
				tagSearchPromise,
			]);

			// Build keywords and node type maps for workflows found by node types
			const keywordsMap = new Map<string, string[]>();
			const nodeTypesMap = new Map<string, string>();
			const matchedNodeDisplayNames = new Map(
				matchedNodes.map((node) => [node.name, node.displayName]),
			);

			byNodeTypes.forEach((workflow) => {
				if (!workflow.nodes) return;

				const matchedWorkflowNodes = workflow.nodes.filter((node) =>
					matchedNodeTypeNames.includes(node.type),
				);

				if (matchedWorkflowNodes.length === 0) return;

				// Store the first matched node type for icon display
				nodeTypesMap.set(workflow.id, matchedWorkflowNodes[0].type);

				// Store all matched display names as keywords
				const matchedDisplayNames = matchedWorkflowNodes
					.map((node) => matchedNodeDisplayNames.get(node.type))
					.filter((name): name is string => !!name);

				if (matchedDisplayNames.length > 0) {
					keywordsMap.set(workflow.id, matchedDisplayNames);
				}
			});

			workflowKeywords.value = keywordsMap;
			workflowMatchedNodeTypes.value = nodeTypesMap;

			// Merge and dedupe by id, filter out archived workflows
			const merged = [...byName, ...byNodeTypes, ...byTags];
			const uniqueById = Array.from(new Map(merged.map((w) => [w.id, w])).values());
			const nonArchivedWorkflows = uniqueById.filter((w) => !w.isArchived);
			workflowResults.value = orderResultByCurrentProjectFirst(nonArchivedWorkflows);

			// Cache parent folders for breadcrumb building
			const parentFolders = nonArchivedWorkflows
				.map((w) => w.parentFolder)
				.filter((pf) => pf !== undefined && pf !== null);

			if (parentFolders.length > 0) {
				foldersStore.cacheFolders(
					parentFolders.map((pf) => ({
						id: pf.id,
						name: pf.name,
						parentFolder: undefined, // We don't have the parent's parent info yet
					})),
				);
			}
		} catch {
			workflowResults.value = [];
			workflowKeywords.value.clear();
			workflowMatchedNodeTypes.value.clear();
		} finally {
			isLoading.value = false;
		}
	};

	const fetchWorkflowsDebounced = debounce(fetchWorkflowsImpl, 300);

	const buildFolderPath = (folderId: string): string[] => {
		const path: string[] = [];
		let currentFolderId: string | undefined = folderId;

		// Traverse up the folder hierarchy using the cache
		while (currentFolderId) {
			const folder = foldersStore.getCachedFolder(currentFolderId);
			if (!folder) break;

			path.unshift(folder.name);
			currentFolderId = folder.parentFolder;
		}

		return path;
	};

	const getProjectIcon = (workflow: IWorkflowDb): IconOrEmoji => {
		if (workflow.homeProject?.type === ProjectTypes.Personal) {
			return { type: 'icon', value: 'user' };
		}

		if (workflow.homeProject?.name) {
			return isIconOrEmoji(workflow.homeProject.icon)
				? workflow.homeProject.icon
				: { type: 'icon', value: 'layers' };
		}

		return { type: 'icon', value: 'house' };
	};

	const getWorkflowProjectSuffix = (workflow: IWorkflowDb) => {
		const parts: string[] = [];

		if (workflow.homeProject && workflow.homeProject.type === ProjectTypes.Personal) {
			parts.push(i18n.baseText('projects.menu.personal'));
		} else if (workflow.homeProject?.name) {
			parts.push(workflow.homeProject.name);
		}

		if (workflow.parentFolder?.id) {
			const folderPath = buildFolderPath(workflow.parentFolder.id);
			// If there are more than 2 folders, show first, "...", and last
			if (folderPath.length > 2) {
				parts.push(folderPath[0], '...', folderPath[folderPath.length - 1]);
			} else {
				parts.push(...folderPath);
			}
		}

		return parts.join(' / ');
	};

	const createWorkflowCommand = (workflow: IWorkflowDb): CommandBarItem => {
		let keywords = workflowKeywords.value.get(workflow.id) ?? [];
		const matchedNodeType = workflowMatchedNodeTypes.value.get(workflow.id);

		// // Get node icon if this workflow matched by node type
		let icon: CommandBarItem['icon'] | undefined;
		if (matchedNodeType) {
			const nodeType = nodeTypesStore.getNodeType(matchedNodeType);
			if (nodeType) {
				icon = {
					component: NodeIcon,
					props: {
						nodeType,
						size: 24,
					},
				};
			}
		}

		// Add workflow name to keywords since we're using a custom component for the title
		const workflowName = workflow.name;
		keywords = [...keywords, workflowName];

		if (workflow.tags && workflow.tags.length > 0) {
			keywords = [
				...keywords,
				...workflow.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)),
			];
		}

		const suffix = getWorkflowProjectSuffix(workflow);

		return {
			id: workflow.id,
			title: {
				component: CommandBarItemTitle,
				props: {
					title: workflow.name || i18n.baseText('commandBar.workflows.unnamed'),
					suffix,
					...(suffix ? { suffixIcon: getProjectIcon(workflow) } : {}),
					actionText: i18n.baseText('generic.open'),
				},
			},
			section: i18n.baseText('commandBar.sections.workflows'),
			...(keywords.length > 0 ? { keywords } : {}),
			...(icon ? { icon } : {}),
			handler: () => {
				const targetRoute = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { name: workflow.id },
				});
				window.location.href = targetRoute.fullPath;
			},
		};
	};

	const openWorkflowCommands = computed<CommandBarItem[]>(() => {
		return workflowResults.value.map((workflow) => createWorkflowCommand(workflow));
	});

	const rootWorkflowItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2) {
			return [];
		}
		return workflowResults.value.map((workflow) => createWorkflowCommand(workflow));
	});

	const workflowNavigationCommands = computed<CommandBarItem[]>(() => {
		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).workflow.create;

		const newWorkflowCommand: CommandBarItem = {
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
		};
		return [
			...(hasCreatePermission ? [newWorkflowCommand] : []),
			{
				id: ITEM_ID.OPEN_WORKFLOW,
				title: i18n.baseText('commandBar.workflows.open'),
				section: i18n.baseText('commandBar.sections.workflows'),
				placeholder: i18n.baseText('commandBar.workflows.searchPlaceholder'),
				children: openWorkflowCommands.value,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'arrow-right',
						color: 'text-light',
					},
				},
			},
			...rootWorkflowItems.value,
		];
	});

	function onCommandBarChange(query: string) {
		const trimmed = query.trim();
		const isInWorkflowParent = activeNodeId.value === ITEM_ID.OPEN_WORKFLOW;
		const isRootWithQuery = activeNodeId.value === null && trimmed.length > 2;

		if (isInWorkflowParent || isRootWithQuery) {
			isLoading.value = isInWorkflowParent;
			void fetchWorkflowsDebounced(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_WORKFLOW) {
			isLoading.value = true;
			void fetchWorkflowsImpl('');
		} else if (to === null) {
			workflowResults.value = [];
			workflowKeywords.value.clear();
			workflowMatchedNodeTypes.value.clear();
		}
	}

	async function initialize() {
		await tagsStore.fetchAll();
	}

	return {
		commands: workflowNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
		isLoading,
		initialize,
	};
}
