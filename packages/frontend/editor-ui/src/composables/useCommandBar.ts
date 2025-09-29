import { computed, onMounted, ref } from 'vue';
import { isResourceLocatorValue } from 'n8n-workflow';
import { useRoute, useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useTagsStore } from '@/stores/tags.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { canvasEventBus } from '@/event-bus/canvas';
import debounce from 'lodash/debounce';
import { DUPLICATE_MODAL_KEY, EXECUTE_WORKFLOW_NODE_TYPE, VIEWS } from '@/constants';
import type { IWorkflowDb, IWorkflowToShare, SimplifiedNodeType } from '@/Interface';
import { getNodeIcon, getNodeIconUrl } from '@/utils/nodeIcon';

import { saveAs } from 'file-saver';
import uniqBy from 'lodash/uniqBy';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowActivate } from './useWorkflowActivate';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { useProjectsStore } from '@/stores/projects.store';
import { useFoldersStore } from '@/stores/folders.store';

const Section = {
	WORKFLOW: 'Workflow',
	NODES: 'Nodes',
	TEMPLATES: 'Templates',
	CREDENTIALS: 'Credentials',
	WORKFLOWS: 'Workflows',
} as const;

export function useCommandBar() {
	const { addNodes, setNodeActive, editableWorkflow, openWorkflowTemplate } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const templatesStore = useTemplatesStore();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const tagsStore = useTagsStore();
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();
	const foldersStore = useFoldersStore();

	const router = useRouter();
	const route = useRoute();

	const workflowHelpers = useWorkflowHelpers();
	const telemetry = useTelemetry();
	const workflowSaving = useWorkflowSaving({ router });
	const workflowActivate = useWorkflowActivate();
	const { runEntireWorkflow } = useRunWorkflow({ router });
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const lastQuery = ref('');

	const initialWorkflows = ref<IWorkflowDb[]>([]);
	const workflowResults = ref<IWorkflowDb[]>([]);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const currentProjectName = computed(() => {
		if (!route.params.projectId || route.params.projectId === personalProjectId.value) {
			return 'Personal';
		}
		return projectsStore.myProjects.find((p) => p.id === (route.params.projectId as string))?.name;
	});

	function orderResultByCurrentProjectFirst<T extends IWorkflowDb>(results: T[]) {
		const currentProjectId = (route.params.projectId as string) || personalProjectId.value;
		return results.sort((a, b) => {
			if (a.homeProject?.id === currentProjectId) return -1;
			if (b.homeProject?.id === currentProjectId) return 1;
			return 0;
		});
	}

	async function fetchInitialWorkflows() {
		try {
			const workflows = await workflowsStore.searchWorkflows({});
			initialWorkflows.value = workflows;
			// If there is no active query, show initial results
			if ((lastQuery.value || '').trim().length === 0) {
				initialWorkflows.value = orderResultByCurrentProjectFirst(initialWorkflows.value);
			}
		} catch {
			workflowResults.value = [];
		}
	}

	const fetchWorkflows = debounce(async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			if (trimmed.length === 0) {
				workflowResults.value = initialWorkflows.value;
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

	function getIconSource(nodeType: SimplifiedNodeType | null) {
		if (!nodeType) return {};
		const baseUrl = rootStore.baseUrl;
		const iconUrl = getNodeIconUrl(nodeType);
		if (iconUrl) {
			return { path: baseUrl + iconUrl };
		}
		// Otherwise, extract it from icon prop
		if (nodeType.icon) {
			const icon = getNodeIcon(nodeType);
			if (icon) {
				const [type, path] = icon.split(':');
				if (type === 'file') {
					throw new Error(`Unexpected icon: ${icon}`);
				}
				return { icon: path };
			}
		}
		return {};
	}

	const addNodeCommands = computed<CommandBarItem[]>(() => {
		const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
		const nodeTypes = nodeTypesStore.visibleNodeTypes;
		const { mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);
		return mergedNodes.map((node) => {
			const { name, displayName } = node;
			const src = getIconSource(node);
			return {
				id: name,
				title: `Add node > ${displayName}`,
				keywords: ['insert', 'add', 'create', 'node'],
				icon: src.path
					? {
							html: `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`,
						}
					: undefined,
				handler: async () => {
					await addNodes([{ type: name }]);
				},
			};
		});
	});

	const openNodeCommnds = computed<CommandBarItem[]>(() => {
		return editableWorkflow.value.nodes.map((node) => {
			const { id, name, type } = node;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			const src = getIconSource(nodeType);
			return {
				id,
				title: `Open node > ${name}`,
				section: Section.NODES,
				keywords: [type],
				icon: src?.path
					? {
							html: `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`,
						}
					: undefined,
				handler: () => {
					setNodeActive(id, 'command_bar');
				},
				placeholder: 'Search by node name, type, etc.',
			};
		});
	});

	const nodeCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'add-node',
				title: 'Add node',
				section: Section.NODES,
				children: [...addNodeCommands.value],
				hotkey: 'tab',
			},
			{
				id: 'add-sticky-note',
				title: 'Add sticky note',
				section: Section.NODES,
				hotkey: 'shift+s',
				handler: () => {
					canvasEventBus.emit('create:sticky');
				},
			},
			{
				id: 'open-node',
				title: 'Open node',
				section: Section.NODES,
				children: [...openNodeCommnds.value],
				hotkey: 'enter',
			},
		];
	});

	const importTemplateCommands = computed<CommandBarItem[]>(() => {
		const templateWorkflows = Object.values(templatesStore.workflows);
		return templateWorkflows.map((template) => {
			const { id, name } = template;
			return {
				id: id.toString(),
				title: `Import template > ${name}`,
				section: Section.TEMPLATES,
				handler: async () => {
					await openWorkflowTemplate(id.toString());
				},
			};
		});
	});

	const templateCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'import-template',
				title: 'Import template',
				children: [...importTemplateCommands.value],
				section: Section.TEMPLATES,
			},
		];
	});

	const subworkflowCommands = computed<CommandBarItem[]>(() => {
		const subworkflows = editableWorkflow.value.nodes
			.filter((node) => node.type === EXECUTE_WORKFLOW_NODE_TYPE)
			.map((node) => node?.parameters?.workflowId)
			.filter(
				(rlValue): rlValue is { value: string; cachedResultName: string } =>
					isResourceLocatorValue(rlValue) &&
					typeof rlValue.value === 'string' &&
					typeof rlValue.cachedResultName === 'string',
			)
			.map(({ value, cachedResultName }) => ({ id: value, name: cachedResultName }));
		if (subworkflows.length === 0) {
			return [];
		}
		return [
			{
				id: 'open-sub-workflow',
				title: 'Open subworkflow',
				children: [
					...subworkflows.map((workflow) => ({
						id: workflow.id,
						title: workflow.name,
						parent: 'Open subworkflow',
						handler: () => {
							const { href } = router.resolve({
								name: VIEWS.WORKFLOW,
								params: { name: workflow.id },
							});
							window.open(href, '_blank', 'noreferrer');
						},
					})),
				],
			},
		];
	});

	const workflowCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'test-workflow',
				title: 'Test workflow',
				section: Section.WORKFLOW,
				keywords: ['test', 'execute', 'run', 'workflow'],
				handler: () => {
					void runEntireWorkflow('main');
				},
			},
			{
				id: 'save-workflow',
				title: 'Save workflow',
				section: Section.WORKFLOW,
				handler: async () => {
					const saved = await workflowSaving.saveCurrentWorkflow();
					if (saved) {
						canvasEventBus.emit('saved:workflow');
					}
				},
			},
			...(workflowsStore.isWorkflowActive
				? [
						{
							id: 'deactivate-workflow',
							title: 'Deactivate workflow',
							section: Section.WORKFLOW,
							handler: () => {
								void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, false);
							},
						},
					]
				: [
						{
							id: 'activate-workflow',
							title: 'Activate workflow',
							section: Section.WORKFLOW,
							handler: () => {
								void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, true);
							},
						},
					]),
			{
				id: 'select-all',
				title: 'Select all',
				section: Section.WORKFLOW,
				handler: () => {
					canvasEventBus.emit('nodes:selectAll');
				},
			},
			{
				id: 'tidy-up-workflow',
				title: 'Tidy up workflow',
				section: Section.WORKFLOW,
				handler: () => {
					canvasEventBus.emit('tidyUp', {
						source: 'command-bar',
					});
				},
			},
			{
				id: 'duplicate-workflow',
				title: 'Duplicate workflow',
				section: Section.WORKFLOW,
				handler: () => {
					uiStore.openModalWithData({
						name: DUPLICATE_MODAL_KEY,
						data: {
							id: workflowsStore.workflowId,
							name: editableWorkflow.value.name,
							tags: editableWorkflow.value.tags,
						},
					});
				},
			},
			{
				id: 'download-workflow',
				title: 'Download workflow',
				section: Section.WORKFLOW,
				handler: async () => {
					const workflowData = await workflowHelpers.getWorkflowDataToSave();
					const { tags, ...data } = workflowData;
					const exportData: IWorkflowToShare = {
						...data,
						meta: {
							...workflowData.meta,
							instanceId: rootStore.instanceId,
						},
						tags: (tags ?? []).map((tagId) => {
							return tagsStore.tagsById[tagId];
						}),
					};
					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: 'application/json;charset=utf-8',
					});
					let name = editableWorkflow.value.name || 'unsaved_workflow';
					name = name.replace(/[^a-z0-9]/gi, '_');
					telemetry.track('User exported workflow', { workflow_id: workflowData.id });
					saveAs(blob, name + '.json');
				},
			},
		];
	});

	const getWorkflowTitle = (workflow: IWorkflowDb) => {
		let prefix = '';
		if (workflow.homeProject && workflow.homeProject.type === 'personal') {
			prefix = 'Open workflow > [Personal] > ';
		} else {
			prefix = `Open workflow > [${workflow.homeProject?.name}] > `;
		}
		return prefix + workflow.name || '(unnamed workflow)';
	};

	const openWorkflowCommands = computed<CommandBarItem[]>(() => {
		return workflowResults.value.map((workflow) => {
			// const matchedNode = workflow.nodes.find(
			// 	(node) => lastQuery.value && node.type.includes(lastQuery.value),
			// );
			// const nodeType = matchedNode
			// 	? nodeTypesStore.getNodeType(matchedNode?.type, matchedNode.typeVersion)
			// 	: null;
			// const src = getIconSource(nodeType);
			return {
				id: workflow.id,
				title: getWorkflowTitle(workflow),
				section: Section.WORKFLOWS,
				// icon: src?.path
				// 	? {
				// 			html: `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`,
				// 		}
				// 	: undefined,
				handler: () => {
					const targetRoute = router.resolve({
						name: VIEWS.WORKFLOW,
						params: { name: workflow.id },
					});
					window.location.href = targetRoute.fullPath;
				},
			};
		});
	});

	const workflowNavigationCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'open-workflow',
				title: 'Open workflow',
				section: Section.WORKFLOWS,
				children: openWorkflowCommands.value,
			},
		];
	});

	const baseitems = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'demo-action',
				title: 'This is available everywhere',
				section: 'Demo',
				handler: () => {
					console.log('hello');
				},
			},
			{
				id: 'create-workflow',
				title: `Create new workflow in ${currentProjectName.value}`,
				section: Section.WORKFLOWS,
				handler: () => {
					void router.push({
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: route.params.projectId as string,
							parentFolderId: route.params.folderId as string,
						},
					});
				},
			},
		];
	});

	const nodeViewItems = computed<CommandBarItem[]>(() => {
		const credentialCommands = computed<CommandBarItem[]>(() => {
			const credentials = uniqBy(
				editableWorkflow.value.nodes.map((node) => Object.values(node.credentials ?? {})).flat(),
				(cred) => cred.id,
			);
			if (credentials.length === 0) {
				return [];
			}
			return [
				{
					id: 'Open credential',
					title: 'Open credential',
					section: Section.CREDENTIALS,
					children: [
						...credentials.map((credential) => ({
							id: credential.id as string,
							title: credential.name,
							handler: () => {
								uiStore.openExistingCredential(credential.id as string);
							},
						})),
					],
				},
			];
		});

		return [
			...nodeCommands.value,
			...workflowCommands.value,
			...subworkflowCommands.value,
			...credentialCommands.value,
			...templateCommands.value,
		];
	});

	const workflowsViewItems = computed<CommandBarItem[]>(() => {
		return [...workflowNavigationCommands.value];
	});

	const items = computed<CommandBarItem[]>(() => {
		const itemsToDisplay = [...baseitems.value];

		if (router.currentRoute.value.name === VIEWS.WORKFLOW) {
			itemsToDisplay.push(...nodeViewItems.value);
		} else if (router.currentRoute.value.name === VIEWS.WORKFLOWS) {
			itemsToDisplay.push(...workflowsViewItems.value);
		}

		return itemsToDisplay;
	});

	function onCommandBarChange(query: string) {
		lastQuery.value = query;

		void fetchWorkflows(query);
	}

	onMounted(async () => {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		await fetchInitialWorkflows();
	});

	return {
		items,
		onCommandBarChange,
	};
}
