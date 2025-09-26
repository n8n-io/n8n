import { computed, type Ref } from 'vue';
import { isResourceLocatorValue } from 'n8n-workflow';
import { useRouter } from 'vue-router';
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
import { DUPLICATE_MODAL_KEY, EXECUTE_WORKFLOW_NODE_TYPE, VIEWS } from '@/constants';
import type { IWorkflowToShare, SimplifiedNodeType } from '@/Interface';
import { getNodeIcon, getNodeIconUrl } from '@/utils/nodeIcon';

import { saveAs } from 'file-saver';
import uniqBy from 'lodash/uniqBy';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowActivate } from './useWorkflowActivate';
import { useRootCommandBar } from './useRootCommandBar';

export type NinjaKeysCommand = {
	id: string;
	title: string;
	hotkey?: string;
	handler?: () => void;
	mdIcon?: string;
	icon?: string;
	parent?: string;
	keywords?: string;
	children?: string[];
	section?: string;
};

export function useCommandBar(workflowId: Ref<string | undefined>) {
	const { addNodes, setNodeActive, editableWorkflow, openWorkflowTemplate } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const templatesStore = useTemplatesStore();
	const router = useRouter();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const tagsStore = useTagsStore();
	const workflowsStore = useWorkflowsStore();
	const workflowHelpers = useWorkflowHelpers();
	const telemetry = useTelemetry();
	const workflowSaving = useWorkflowSaving({ router });
	const workflowActivate = useWorkflowActivate();
	const { runEntireWorkflow } = useRunWorkflow({ router });
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const rootCommandBar = useRootCommandBar();

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

	const addNodeCommands = computed<NinjaKeysCommand[]>(() => {
		const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
		const nodeTypes = nodeTypesStore.visibleNodeTypes;
		const { mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);
		return mergedNodes.map((node) => {
			const { name, displayName } = node;
			const src = getIconSource(node);
			return {
				id: name,
				title: `Add node > ${displayName}`,
				keywords: 'Insert node',
				icon: src?.path
					? `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`
					: '',
				parent: 'Add node',
				handler: async () => {
					await addNodes([{ type: name }]);
				},
			};
		});
	});

	const openNodeCommnds = computed<NinjaKeysCommand[]>(() => {
		return editableWorkflow.value.nodes.map((node) => {
			const { id, name, type } = node;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			const src = getIconSource(nodeType);
			return {
				id,
				title: `Open node > ${name}`,
				parent: 'Open node',
				keywords: `${type}`,
				icon: src?.path
					? `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`
					: '',
				handler: () => {
					setNodeActive(id, 'command_bar');
				},
			};
		});
	});

	const nodeCommands = computed<NinjaKeysCommand[]>(() => {
		return [
			{
				id: 'Add node',
				title: 'Add node',
				section: 'Nodes',
				children: addNodeCommands.value.map((cmd) => cmd.id),
				hotkey: 'tab',
			},
			...addNodeCommands.value,
			{
				id: 'Add sticky note',
				title: 'Add sticky note',
				section: 'Nodes',
				hotkey: 'shift+s',
				handler: () => {
					canvasEventBus.emit('create:sticky');
				},
			},
			{
				id: 'Open node',
				title: 'Open node',
				children: openNodeCommnds.value.map((cmd) => cmd.id),
				section: 'Nodes',
				hotkey: 'enter',
			},
			...openNodeCommnds.value,
		];
	});

	const importTemplateCommands = computed<NinjaKeysCommand[]>(() => {
		const templateWorkflows = Object.values(templatesStore.workflows);
		return templateWorkflows.map((template) => {
			const { id, name } = template;
			return {
				id: id.toString(),
				title: `Import template > ${name}`,
				parent: 'Import template',
				handler: async () => {
					await openWorkflowTemplate(id.toString());
				},
			};
		});
	});

	const templateCommands = computed<NinjaKeysCommand[]>(() => {
		return [
			{
				id: 'Import template',
				title: 'Import template',
				children: importTemplateCommands.value.map((cmd) => cmd.id),
				section: 'Templates',
			},
			...importTemplateCommands.value,
		];
	});

	const subworkflowCommands = computed<NinjaKeysCommand[]>(() => {
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
				id: 'Open subworkflow',
				title: 'Open subworkflow',
				children: subworkflows.map((workflow) => workflow.id),
			},
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
		];
	});

	const workflowCommands = computed<NinjaKeysCommand[]>(() => {
		return [
			{
				id: 'Test workflow',
				title: 'Test workflow',
				section: 'Workflow',
				keywords: 'Execute workflow',
				handler: () => {
					void runEntireWorkflow('main');
				},
			},
			{
				id: 'Save workflow',
				title: 'Save workflow',
				section: 'Workflow',
				hotkey: 'command+s',
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
							id: 'Deactivate workflow',
							title: 'Deactivate workflow',
							section: 'Workflow',
							handler: () => {
								void workflowActivate.updateWorkflowActivation(workflowId.value, false);
							},
						},
					]
				: [
						{
							id: 'Activate workflow',
							title: 'Activate workflow',
							section: 'Workflow',
							handler: () => {
								void workflowActivate.updateWorkflowActivation(workflowId.value, true);
							},
						},
					]),
			{
				id: 'Select all',
				title: 'Select all',
				section: 'Workflow',
				hotkey: 'command+a',
				handler: () => {
					canvasEventBus.emit('nodes:selectAll');
				},
			},
			{
				id: 'Tidy up workflow',
				title: 'Tidy up workflow',
				section: 'Workflow',
				hotkey: 'shift+option+t',
				handler: () => {
					canvasEventBus.emit('tidyUp', {
						source: 'command-bar',
					});
				},
			},
			{
				id: 'Duplicate workflow',
				title: 'Duplicate workflow',
				section: 'Workflow',
				handler: () => {
					uiStore.openModalWithData({
						name: DUPLICATE_MODAL_KEY,
						data: {
							id: workflowId.value,
							name: editableWorkflow.value.name,
							tags: editableWorkflow.value.tags,
						},
					});
				},
			},
			{
				id: 'Download workflow',
				title: 'Download workflow',
				section: 'Workflow',
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
							const { usageCount, ...tag } = tagsStore.tagsById[tagId];
							return tag;
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

	const hotkeys = computed<NinjaKeysCommand[]>(() => {
		const credentialCommands = computed<NinjaKeysCommand[]>(() => {
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
					section: 'Credentials',
					children: credentials.map((credential) => credential.id as string),
				},
				...credentials.map((credential) => ({
					id: credential.id as string,
					title: credential.name,
					parent: 'Open credential',
					handler: () => {
						uiStore.openExistingCredential(credential.id as string);
					},
				})),
			];
		});

		return [
			...nodeCommands.value,
			...workflowCommands.value,
			...subworkflowCommands.value,
			...credentialCommands.value,
			...templateCommands.value,
			...rootCommandBar.hotkeys.value,
		];
	});

	function onCommandBarChange(event: CustomEvent) {
		rootCommandBar.onCommandBarChange(event);
	}

	return {
		hotkeys,
		onCommandBarChange,
	};
}
