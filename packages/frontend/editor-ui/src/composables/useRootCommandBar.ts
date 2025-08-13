import { computed, ref, onMounted, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { NinjaKeysCommand } from './useCommandBar';
import debounce from 'lodash/debounce';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { IWorkflowDb, ICredentialsResponse } from '@/Interface';
import { useExecutionsStore } from '@/stores/executions.store';
import type { ExecutionSummary } from 'n8n-workflow';
import { useProjectsStore } from '@/stores/projects.store';

export function useRootCommandBar(): {
	hotkeys: ComputedRef<NinjaKeysCommand[]>;
	onCommandBarChange: (event: CustomEvent) => void;
} {
	const router = useRouter();
	const route = useRoute();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const executionsStore = useExecutionsStore();
	const projectsStore = useProjectsStore();
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const workflowResults = ref<IWorkflowDb[]>([]);
	const credentialResults = ref<ICredentialsResponse[]>([]);
	const allCredentials = ref<ICredentialsResponse[]>([]);
	const executionResults = ref<ExecutionSummary[]>([]);
	const initialResults = ref<IWorkflowDb[]>([]);
	const lastQuery = ref('');

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const getWorkflowTitle = (workflow: IWorkflowDb) => {
		let prefix = '';
		if (workflow.homeProject && workflow.homeProject.type === 'personal') {
			prefix = '[Personal] > ';
		} else {
			prefix = `[${workflow.homeProject?.name}] > `;
		}
		return prefix + workflow.name || '(unnamed workflow)';
	};

	const getCredentialTitle = (credential: ICredentialsResponse) => {
		let prefix = '';
		if (credential.homeProject && credential.homeProject.type === 'personal') {
			prefix = '[Personal] > ';
		} else if (credential.homeProject && credential.homeProject.type === 'team') {
			prefix = '[Shared] > ';
		} else {
			const projectName = credential.homeProject?.name ?? '';
			prefix = projectName ? `[${projectName}] > ` : '';
		}
		return prefix + credential.name || '(unnamed credential)';
	};

	const workflowItemCommands = computed<NinjaKeysCommand[]>(() => {
		return (workflowResults.value || []).map((w) => ({
			id: w.id,
			title: getWorkflowTitle(w),
			parent: 'Workflows',
			section: 'Workflows',
			// Ensure ninja-keys matches these dynamic results on the current query
			// even if the workflow title doesn't include it (e.g. node-type search)
			keywords: lastQuery.value,
			handler: () => {
				void router.push({ name: VIEWS.WORKFLOW, params: { name: w.id } });
			},
		}));
	});

	const credentialItemCommands = computed<NinjaKeysCommand[]>(() => {
		return (credentialResults.value || []).map((c: ICredentialsResponse) => ({
			id: c.id,
			title: getCredentialTitle(c),
			parent: 'Credentials',
			section: 'Credentials',
			keywords: lastQuery.value,
			handler: () => {
				void router.push({ name: VIEWS.CREDENTIALS, params: { credentialId: c.id } });
			},
		}));
	});

	const getExecutionTitle = (e: ExecutionSummary) => {
		const workflowName = (e as unknown as { workflowName?: string }).workflowName || 'Workflow';
		return `${workflowName} • ${e.id}`;
	};

	const executionItemCommands = computed<NinjaKeysCommand[]>(() => {
		return (executionResults.value || []).map((e: ExecutionSummary) => ({
			id: e.id,
			title: getExecutionTitle(e),
			parent: 'Executions',
			section: 'Executions',
			keywords: lastQuery.value,
			handler: () => {
				void router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: e.workflowId, executionId: e.id },
				});
			},
		}));
	});

	const hotkeys = computed<NinjaKeysCommand[]>({
		get() {
			const workflowItems = workflowItemCommands.value;
			const credentialItems = credentialItemCommands.value;
			const executionItems = executionItemCommands.value;
			return [
				{
					id: 'create-workflow',
					title: 'Create new workflow',
					section: 'Workflows',
					handler: () => {
						console.log('create-workflow', route.params);
						void router.push({
							name: VIEWS.NEW_WORKFLOW,
							query: {
								projectId: route.params.projectId as string,
								parentFolderId: route.params.folderId as string,
							},
						});
					},
				},
				{
					id: 'create-credential',
					title: 'Create new credential',
					section: 'Credentials',
					handler: () => {
						console.log('create-credential', route.params);
						void router.push({
							name: VIEWS.PROJECTS_CREDENTIALS,
							params: {
								projectId: (route.params.projectId as string) || personalProjectId.value,
								credentialId: 'create',
							},
						});
					},
				},
				{
					id: 'Workflows',
					title: 'Search workflows',
					section: 'Workflows',
					children: workflowItems.map((i) => i.id),
					handler: () => {
						return { keepOpen: true };
					},
				},
				...workflowItems,
				{
					id: 'Credentials',
					title: 'Search credentials',
					section: 'Credentials',
					children: credentialItems.map((i) => i.id),
					handler: () => {
						return { keepOpen: true };
					},
				},
				...credentialItems,
				{
					id: 'Executions',
					title: 'Search executions',
					section: 'Executions',
					children: executionItems.map((i) => i.id),
					handler: () => {
						return { keepOpen: true };
					},
				},
				...executionItems,
			];
		},
		set(_value: NinjaKeysCommand[]) {
			// no-op setter to satisfy WritableComputedRef typing where used
		},
	});

	const fetchWorkflows = debounce(async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			if (trimmed.length === 0) {
				workflowResults.value = initialResults.value;
				return;
			}
			if (trimmed.length < 2) {
				// Keep existing results (e.g., initial list) if query is too short
				return;
			}

			// Search by workflow name
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
							nodeTypes: matchedNodeTypeNames,
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

	async function fetchInitialWorkflows() {
		try {
			const workflows = await workflowsStore.searchWorkflows({});
			initialResults.value = workflows;
			// If there is no active query, show initial results
			if ((lastQuery.value || '').trim().length === 0) {
				workflowResults.value = orderResultByCurrentProjectFirst(initialResults.value);
			}
		} catch {
			workflowResults.value = [];
		}
	}

	async function fetchCredentials() {
		const credentials = await credentialsStore.fetchAllCredentials();
		allCredentials.value = credentials;
		credentialResults.value = orderResultByCurrentProjectFirst(allCredentials.value);
	}

	async function fetchExecutions() {
		try {
			await executionsStore.fetchExecutions();
			executionResults.value = executionsStore.allExecutions;
		} catch {
			executionResults.value = [];
		}
	}

	async function filterCredentials(query: string) {
		const trimmed = (query || '').trim();
		if (trimmed.length === 0) {
			credentialResults.value = allCredentials.value;
			return;
		}
		credentialResults.value = allCredentials.value.filter((c) =>
			c.name.toLowerCase().includes(trimmed.toLowerCase()),
		);
	}

	function orderResultByCurrentProjectFirst<T extends IWorkflowDb | ICredentialsResponse>(
		results: T[],
	) {
		const currentProjectId = (route.params.projectId as string) || personalProjectId.value;
		return results.sort((a, b) => {
			if (a.homeProject?.id === currentProjectId) return -1;
			if (b.homeProject?.id === currentProjectId) return 1;
			return 0;
		});
	}

	function filterExecutions(query: string) {
		const trimmed = (query || '').trim().toLowerCase();
		if (!trimmed) {
			executionResults.value = executionsStore.allExecutions;
			return;
		}
		executionResults.value = executionsStore.allExecutions.filter((e) => {
			const idMatch = (e.id || '').toLowerCase().includes(trimmed);
			const workflowName = (e as unknown as { workflowName?: string }).workflowName ?? '';
			const nameMatch = workflowName.toLowerCase().includes(trimmed);
			return idMatch || nameMatch;
		});
	}

	function onCommandBarChange(event: CustomEvent) {
		const query = (event as unknown as { detail?: { search?: string } }).detail?.search ?? '';
		lastQuery.value = query;
		void fetchWorkflows(query);
		void filterCredentials(query);
		void filterExecutions(query);
	}

	onMounted(async () => {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		await fetchInitialWorkflows();
		await fetchCredentials();
		await fetchExecutions();
	});

	return {
		hotkeys,
		onCommandBarChange,
	};
}
