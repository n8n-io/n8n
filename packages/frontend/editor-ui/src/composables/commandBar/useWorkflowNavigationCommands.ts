import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import debounce from 'lodash/debounce';
import { VIEWS } from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getIconSource } from '@/utils/nodeIconUtils';
import type { CommandGroup, CommandBarItem } from './types';
import { useTagsStore } from '@/stores/tags.store';

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
	const rootStore = useRootStore();
	const tagsStore = useTagsStore();

	const router = useRouter();
	const route = useRoute();

	const { generateMergedNodesAndActions } = useActionsGenerator();

	const workflowResults = ref<IWorkflowDb[]>([]);
	const workflowKeywords = ref<Map<string, string[]>>(new Map());
	const workflowMatchedNodeTypes = ref<Map<string, string>>(new Map());
	const isLoading = ref(false);

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
				select: ['id', 'name', 'active', 'ownedBy'],
			});

			const nodeTypeSearchPromise =
				matchedNodeTypeNames.length > 0
					? workflowsStore.searchWorkflows({
							nodeTypes: matchedNodeTypeNames,
							select: ['id', 'name', 'active', 'nodes', 'ownedBy'],
						})
					: Promise.resolve([]);

			const tagSearchPromise = matchedTag
				? workflowsStore.searchWorkflows({
						tags: [matchedTag.name],
						select: ['id', 'name', 'active', 'ownedBy', 'tags'],
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

			// Merge and dedupe by id
			const merged = [...byName, ...byNodeTypes, ...byTags];
			const uniqueById = Array.from(new Map(merged.map((w) => [w.id, w])).values());
			workflowResults.value = orderResultByCurrentProjectFirst(uniqueById);
		} catch {
			workflowResults.value = [];
			workflowKeywords.value.clear();
			workflowMatchedNodeTypes.value.clear();
		} finally {
			isLoading.value = false;
		}
	};

	const fetchWorkflowsDebounced = debounce(fetchWorkflowsImpl, 300);

	const getWorkflowTitle = (workflow: IWorkflowDb, includeOpenWorkflowPrefix: boolean) => {
		let prefix = '';
		if (workflow.homeProject && workflow.homeProject.type === 'personal') {
			prefix = includeOpenWorkflowPrefix
				? i18n.baseText('commandBar.workflows.openPrefixPersonal')
				: i18n.baseText('commandBar.workflows.prefixPersonal');
		} else {
			prefix = includeOpenWorkflowPrefix
				? i18n.baseText('commandBar.workflows.openPrefixProject', {
						interpolate: { projectName: workflow.homeProject?.name ?? '' },
					})
				: i18n.baseText('commandBar.workflows.prefixProject', {
						interpolate: { projectName: workflow.homeProject?.name ?? '' },
					});
		}
		return prefix + (workflow.name || i18n.baseText('commandBar.workflows.unnamed'));
	};

	const createWorkflowCommand = (
		workflow: IWorkflowDb,
		includeOpenWorkflowPrefix: boolean,
	): CommandBarItem => {
		const keywords = workflowKeywords.value.get(workflow.id) ?? [];
		const matchedNodeType = workflowMatchedNodeTypes.value.get(workflow.id);

		// Get node icon if this workflow matched by node type
		let icon: CommandBarItem['icon'] | undefined;
		if (matchedNodeType) {
			const nodeType = nodeTypesStore.getNodeType(matchedNodeType);
			const src = getIconSource(nodeType, rootStore.baseUrl);
			if (src?.path) {
				icon = {
					html: `<img src="${src.path}" style="width: 100%; height: 100%; object-fit: contain;" />`,
				};
			}
		}

		if (workflow.tags && workflow.tags.length > 0) {
			keywords.push(...workflow.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)));
		}

		return {
			id: workflow.id,
			title: getWorkflowTitle(workflow, includeOpenWorkflowPrefix),
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
		return workflowResults.value.map((workflow) => createWorkflowCommand(workflow, false));
	});

	const rootWorkflowItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2) {
			return [];
		}
		return workflowResults.value.map((workflow) => createWorkflowCommand(workflow, true));
	});

	const workflowNavigationCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: ITEM_ID.CREATE_WORKFLOW,
				title: i18n.baseText('commandBar.workflows.create', {
					interpolate: { projectName: currentProjectName.value },
				}),
				section: i18n.baseText('commandBar.sections.workflows'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'plus',
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
