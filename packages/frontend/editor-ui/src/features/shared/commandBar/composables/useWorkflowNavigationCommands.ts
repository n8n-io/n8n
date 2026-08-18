import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useActionsGenerator } from '@/features/shared/nodeCreator/composables/useActionsGeneration';
import debounce from 'lodash/debounce';
import { VIEWS } from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { CommandGroup, CommandBarItem } from '../types';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { WorkflowContentMatchType, WorkflowContentSearchItem } from '@n8n/api-types';
import { searchWorkflowContent } from '@/app/api/workflows';

const ITEM_ID = {
	CREATE_WORKFLOW: 'create-workflow',
	OPEN_WORKFLOW: 'open-workflow',
	DEEP_SEARCH: 'deep-search-workflows',
	DEEP_SEARCH_HINT: 'deep-search-workflows-hint',
};

const DEEP_SEARCH_LIMIT = 100;
// Must match the backend's CONTENT_SEARCH_MIN_QUERY_LENGTH
const DEEP_SEARCH_MIN_QUERY_LENGTH = 3;

const DEEP_SEARCH_SECTION_KEYS = {
	name: 'commandBar.workflows.deepSearch.section.name',
	nodeName: 'commandBar.workflows.deepSearch.section.nodeName',
	nodeParameters: 'commandBar.workflows.deepSearch.section.nodeParameters',
	description: 'commandBar.workflows.deepSearch.section.description',
	history: 'commandBar.workflows.deepSearch.section.history',
	other: 'commandBar.workflows.deepSearch.section.other',
	historyContent: 'commandBar.workflows.deepSearch.section.historyContent',
} as const satisfies Record<WorkflowContentMatchType, string>;

/** The subset of workflow data the open-workflow command items render. */
type WorkflowCommandData = Pick<
	IWorkflowDb,
	'id' | 'name' | 'description' | 'tags' | 'parentFolder'
> & {
	homeProject?: Pick<NonNullable<IWorkflowDb['homeProject']>, 'id' | 'name' | 'type' | 'icon'>;
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
	const workflowsListStore = useWorkflowsListStore();
	const projectsStore = useProjectsStore();
	const tagsStore = useTagsStore();
	const sourceControlStore = useSourceControlStore();
	const foldersStore = useFoldersStore();
	const rootStore = useRootStore();

	const router = useRouter();
	const route = useRoute();

	const { generateMergedNodesAndActions } = useActionsGenerator();

	const workflowResults = ref<IWorkflowDb[]>([]);
	const workflowKeywords = ref<Map<string, string[]>>(new Map());
	const workflowMatchedNodeTypes = ref<Map<string, string>>(new Map());
	const isLoading = ref(false);

	const deepSearchPhrase = ref('');
	const deepSearchResults = ref<WorkflowContentSearchItem[]>([]);
	const deepSearchDone = ref(false);
	let deepSearchRunId = 0;

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	function orderResultByCurrentProjectFirst<T extends IWorkflowDb>(results: T[]) {
		return results.sort((a, b) => {
			if (a.homeProject?.id === projectsStore.currentProjectId) return -1;
			if (b.homeProject?.id === projectsStore.currentProjectId) return 1;
			return 0;
		});
	}

	// Cache parent folders for breadcrumb building
	const cacheParentFolders = (workflows: IWorkflowDb[]) => {
		const parentFolders = workflows
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
	};

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
			const nameSearchPromise = workflowsListStore.searchWorkflows({
				query: trimmed,
				select: ['id', 'name', 'versionId', 'ownedBy', 'parentFolder', 'isArchived', 'description'],
			});

			const nodeTypeSearchPromise =
				matchedNodeTypeNames.length > 0
					? workflowsListStore.searchWorkflows({
							nodeTypes: matchedNodeTypeNames,
							select: [
								'id',
								'name',
								'versionId',
								'nodes',
								'ownedBy',
								'parentFolder',
								'isArchived',
								'description',
							],
						})
					: Promise.resolve([]);

			const tagSearchPromise = matchedTag
				? workflowsListStore.searchWorkflows({
						tags: [matchedTag.name],
						select: [
							'id',
							'name',
							'versionId',
							'ownedBy',
							'tags',
							'parentFolder',
							'isArchived',
							'description',
						],
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

			cacheParentFolders(nonArchivedWorkflows);
		} catch {
			workflowResults.value = [];
			workflowKeywords.value.clear();
			workflowMatchedNodeTypes.value.clear();
		} finally {
			isLoading.value = false;
		}
	};

	const fetchWorkflowsDebounced = debounce(fetchWorkflowsImpl, 300);

	const runDeepSearch = async (phrase: string) => {
		const runId = ++deepSearchRunId;
		deepSearchPhrase.value = phrase;
		deepSearchResults.value = [];
		deepSearchDone.value = false;
		if (!phrase) {
			deepSearchDone.value = true;
			return;
		}
		isLoading.value = true;

		try {
			const { results } = await searchWorkflowContent(rootStore.restApiContext, {
				query: phrase,
				limit: DEEP_SEARCH_LIMIT,
			});
			if (runId !== deepSearchRunId) return;

			deepSearchResults.value = results;

			// Cache parent folders for breadcrumb building
			const parentFolders = results
				.map((result) => result.parentFolder)
				.filter((pf) => pf !== null);
			if (parentFolders.length > 0) {
				foldersStore.cacheFolders(
					parentFolders.map((pf) => ({
						id: pf.id,
						name: pf.name,
						parentFolder: pf.parentFolderId ?? undefined,
					})),
				);
			}
		} catch {
			deepSearchResults.value = [];
		} finally {
			if (runId === deepSearchRunId) {
				isLoading.value = false;
				deepSearchDone.value = true;
			}
		}
	};

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

	const getProjectIcon = (workflow: WorkflowCommandData): IconOrEmoji => {
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

	const getWorkflowProjectSuffix = (workflow: WorkflowCommandData) => {
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

	const openWorkflowCommand = (workflow: WorkflowCommandData, isRoot: boolean): CommandBarItem => {
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

		if (workflow.description) {
			keywords = [...keywords, workflow.description];
		}

		if (workflow.tags && workflow.tags.length > 0) {
			keywords = [
				...keywords,
				...workflow.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)),
			];
		}

		const suffix = getWorkflowProjectSuffix(workflow);

		const name = workflow.name || i18n.baseText('commandBar.workflows.unnamed');
		const title = isRoot
			? i18n.baseText('generic.openResource', {
					interpolate: { resource: name },
				})
			: name;
		const section = isRoot
			? i18n.baseText('commandBar.sections.workflows')
			: i18n.baseText('commandBar.workflows.open');

		return {
			id: workflow.id,
			matchAnySearchTerm: !isRoot,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix,
					...(suffix ? { suffixIcon: getProjectIcon(workflow) } : {}),
				},
			},
			section,
			...(keywords.length > 0 ? { keywords } : {}),
			...(icon ? { icon } : {}),
			handler: () => {
				const targetRoute = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId: workflow.id },
				});
				window.location.href = targetRoute.fullPath;
			},
		};
	};

	const openWorkflowCommands = computed<CommandBarItem[]>(() => {
		return workflowResults.value.map((workflow) => openWorkflowCommand(workflow, false));
	});

	const rootWorkflowItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2 || !workflowsStore.canViewWorkflows) {
			return [];
		}
		return workflowResults.value.map((workflow) => openWorkflowCommand(workflow, true));
	});

	const deepSearchItems = computed<CommandBarItem[]>(() => {
		if (deepSearchResults.value.length === 0) {
			return deepSearchDone.value
				? [
						{
							id: 'deep-search-no-results',
							title: i18n.baseText('commandBar.workflows.deepSearch.noResults', {
								interpolate: { query: deepSearchPhrase.value },
							}),
						},
					]
				: [];
		}

		// Results arrive pre-sorted by match priority (name, node name, node
		// parameters, description, version history, other)
		return deepSearchResults.value.map((result) => {
			const base = openWorkflowCommand(
				{
					id: result.id,
					name: result.name,
					description: result.description,
					tags: result.tags.map((tag) => tag.name),
					parentFolder: result.parentFolder ?? undefined,
					homeProject: result.homeProject ?? undefined,
				},
				false,
			);
			return {
				...base,
				section: i18n.baseText(DEEP_SEARCH_SECTION_KEYS[result.matchedIn]),
				keywords: [...(base.keywords ?? []), ...(result.matchDetail ? [result.matchDetail] : [])],
				// Open the workflow directly on the matched node when there is one,
				// and history matches on the matched version in the history view
				...(result.matchedNodeId
					? {
							handler: () => {
								const targetRoute = router.resolve({
									name: VIEWS.WORKFLOW,
									params: { workflowId: result.id, nodeId: result.matchedNodeId },
								});
								window.location.href = targetRoute.fullPath;
							},
						}
					: {}),
				...(result.matchedVersionId
					? {
							handler: () => {
								const targetRoute = router.resolve({
									name: VIEWS.WORKFLOW_HISTORY,
									params: { workflowId: result.id, versionId: result.matchedVersionId },
								});
								window.location.href = targetRoute.fullPath;
							},
						}
					: {}),
			};
		});
	});

	const deepSearchRootItem = computed<CommandBarItem | null>(() => {
		const trimmed = lastQuery.value.trim();
		// Navigating into the item clears the input (and with it lastQuery), so
		// while it is the active parent it must stay in the list unconditionally
		// or the command bar loses its current view and resets to the root
		const isActive = activeNodeId.value === ITEM_ID.DEEP_SEARCH;
		if (!workflowsStore.canViewWorkflows || (!isActive && trimmed.length === 0)) {
			return null;
		}
		if (!isActive && trimmed.length < DEEP_SEARCH_MIN_QUERY_LENGTH) {
			return {
				id: ITEM_ID.DEEP_SEARCH_HINT,
				title: i18n.baseText('commandBar.workflows.deepSearch.minChars', {
					interpolate: { count: `${DEEP_SEARCH_MIN_QUERY_LENGTH}` },
				}),
				section: i18n.baseText('commandBar.sections.workflows'),
				// Always contains the current query, so the item survives the search filter
				keywords: [trimmed],
				icon: {
					component: N8nIcon,
					props: {
						icon: 'search',
						color: 'text-light',
					},
				},
			};
		}
		const phrase = isActive ? deepSearchPhrase.value : trimmed;
		return {
			id: ITEM_ID.DEEP_SEARCH,
			title: i18n.baseText('commandBar.workflows.deepSearch', {
				interpolate: { query: phrase },
			}),
			section: i18n.baseText('commandBar.sections.workflows'),
			placeholder: i18n.baseText('commandBar.workflows.deepSearch.placeholder'),
			// Always contains the current query, so the item survives the search filter
			keywords: [trimmed],
			children: deepSearchItems.value,
			icon: {
				component: N8nIcon,
				props: {
					icon: 'search',
					color: 'text-light',
				},
			},
		};
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
			...(workflowsStore.canViewWorkflows
				? [
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
					]
				: []),
			...rootWorkflowItems.value,
			...(deepSearchRootItem.value ? [deepSearchRootItem.value] : []),
		];
	});

	function onCommandBarChange(query: string) {
		const trimmed = query.trim();
		const isInWorkflowParent = activeNodeId.value === ITEM_ID.OPEN_WORKFLOW;
		const isRootWithQuery = activeNodeId.value === null && trimmed.length > 2;

		if (isInWorkflowParent || isRootWithQuery) {
			isLoading.value = true;
			void fetchWorkflowsDebounced(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		// A quick-search fetch scheduled at the root must not fire after
		// navigation: it would overwrite fresh results and clear the shared
		// loading state while a deep search is still running
		fetchWorkflowsDebounced.cancel();

		if (to === ITEM_ID.OPEN_WORKFLOW) {
			isLoading.value = true;
			void fetchWorkflowsImpl('');
		} else if (to === ITEM_ID.DEEP_SEARCH) {
			// lastQuery still holds the phrase typed at the root; the input clears afterwards
			void runDeepSearch(lastQuery.value.trim());
		} else if (to === null) {
			deepSearchRunId++;
			deepSearchResults.value = [];
			deepSearchDone.value = false;
			isLoading.value = false;
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
