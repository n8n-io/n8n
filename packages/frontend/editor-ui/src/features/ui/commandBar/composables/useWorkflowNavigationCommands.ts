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
import { useProjectsStore } from '@/features/projects/projects.store';
import type { CommandGroup, CommandBarItem } from '../commandBar.types';

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

	const router = useRouter();
	const route = useRoute();

	const { generateMergedNodesAndActions } = useActionsGenerator();

	const workflowResults = ref<IWorkflowDb[]>([]);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	function orderResultByCurrentProjectFirst<T extends IWorkflowDb>(results: T[]) {
		const currentProjectId =
			typeof route.params.projectId === 'string' ? route.params.projectId : personalProjectId.value;
		return results.sort((a, b) => {
			if (a.homeProject?.id === currentProjectId) return -1;
			if (b.homeProject?.id === currentProjectId) return 1;
			return 0;
		});
	}

	const fetchWorkflows = debounce(async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			const nameSearchPromise = workflowsStore.searchWorkflows({
				name: trimmed,
			});

			// Find matching node types from available nodes
			const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
			const visibleNodeTypes = nodeTypesStore.allNodeTypes;
			const { mergedNodes } = generateMergedNodesAndActions(visibleNodeTypes, httpOnlyCredentials);
			const trimmedLower = trimmed.toLowerCase();
			const matchedNodeTypeNames = Array.from(
				new Set(
					mergedNodes
						.filter(
							(node) =>
								node.displayName?.toLowerCase().includes(trimmedLower) ||
								node.name?.toLowerCase().includes(trimmedLower),
						)
						.map((node) => node.name),
				),
			);

			const nodeTypeSearchPromise =
				matchedNodeTypeNames.length > 0
					? workflowsStore.searchWorkflows({
							// nodeTypes: matchedNodeTypeNames, TODO
						})
					: Promise.resolve([]);

			const [byName, byNodeTypes] = await Promise.all([nameSearchPromise, nodeTypeSearchPromise]);

			// Merge and dedupe by id
			const merged = [...byName, ...byNodeTypes];
			const uniqueById = Array.from(new Map(merged.map((w) => [w.id, w])).values());
			workflowResults.value = orderResultByCurrentProjectFirst(uniqueById);
		} catch {
			workflowResults.value = [];
		}
	}, 300);

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
		return {
			id: workflow.id,
			title: getWorkflowTitle(workflow, includeOpenWorkflowPrefix),
			section: i18n.baseText('commandBar.sections.workflows'),
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
					void router.push({
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: route.params.projectId,
							parentFolderId: route.params.folderId,
						},
					});
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
		lastQuery.value = query;

		const trimmed = query.trim();
		if (trimmed.length > 2 || activeNodeId.value === ITEM_ID.OPEN_WORKFLOW) {
			void fetchWorkflows(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_WORKFLOW) {
			void fetchWorkflows('');
		} else if (to === null) {
			workflowResults.value = [];
		}
	}

	return {
		commands: workflowNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
	};
}
