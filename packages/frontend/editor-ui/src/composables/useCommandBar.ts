import { computed, type Ref } from 'vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { useTemplatesStore } from '@/stores/templates.store';
import { DUPLICATE_MODAL_KEY, EXECUTE_WORKFLOW_NODE_TYPE, VIEWS } from '@/constants';
import { isResourceLocatorValue } from 'n8n-workflow';
import { useRouter } from 'vue-router';
import type { IWorkflowToShare, SimplifiedNodeType } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getNodeIcon, getNodeIconUrl } from '@/utils/nodeIcon';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowHelpers } from './useWorkflowHelpers';
import { useTagsStore } from '@/stores/tags.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { saveAs } from 'file-saver';
import uniqBy from 'lodash/uniqBy';

export type NinjaKeysCommand = {
	id: string;
	title: string;
	section?: string;
	children?: string[];
	handler?: () => void;
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
	const workflowHelpers = useWorkflowHelpers();
	const telemetry = useTelemetry();
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const getAllNodesCommands = computed<NinjaKeysCommand[]>(() => {
		return editableWorkflow.value.nodes.map((node) => {
			const { id, name } = node;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			const src = getIconSource(nodeType);
			return {
				id,
				title: `Open "${name}" Node`,
				parent: 'Open node',
				icon: src?.path
					? `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`
					: '',
				handler: () => {
					setNodeActive(id);
				},
			};
		});
	});

	const addNodeCommand = computed<NinjaKeysCommand[]>(() => {
		const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
		const nodeTypes = nodeTypesStore.visibleNodeTypes;
		const { mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);
		return mergedNodes.map((node) => {
			const { name, displayName } = node;
			const src = getIconSource(node);
			return {
				id: name,
				title: `Add ${displayName} Node`,
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

	const allTemplateCommand = computed<NinjaKeysCommand[]>(() => {
		const templateWorkflows = Object.values(templatesStore.workflows);
		return templateWorkflows.map((template) => {
			const { id, name } = template;
			return {
				id: id.toString(),
				title: `Import ${name} Template`,
				parent: 'Import template',
				handler: async () => {
					await openWorkflowTemplate(id.toString());
				},
			};
		});
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

	const hotkeys = computed<NinjaKeysCommand[]>(() => {
		const allOpenNodeCommands = getAllNodesCommands.value;
		const allAddNodeCommands = addNodeCommand.value;
		const allTemplateCommands = allTemplateCommand.value;
		const rootCommands: NinjaKeysCommand[] = [
			{
				id: 'Add node',
				title: 'Add node',
				section: 'Nodes',
				children: allAddNodeCommands.map((cmd) => cmd.id),
			},
			{
				id: 'Open node',
				title: 'Open node',
				children: allOpenNodeCommands.map((cmd) => cmd.id),
				section: 'Nodes',
			},
			{
				id: 'Import template',
				title: 'Import template',
				children: allTemplateCommands.map((cmd) => cmd.id),
				section: 'Templates',
			},
			{
				id: 'Test workflow',
				title: 'Test workflow',
				section: 'Workflow',
				handler: () => {
					// TODO
					// void onRunWorkflow();
				},
			},
			{
				id: 'Save workflow',
				title: 'Save workflow',
				section: 'Workflow',
				handler: () => {
					// TODO: This is defined on NodeView.vue
					// void onSaveWorkflow();
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

		return rootCommands
			.concat(allOpenNodeCommands)
			.concat(addNodeCommand.value)
			.concat(allTemplateCommand.value)
			.concat(subworkflowCommands.value)
			.concat(credentialCommands.value);
	});

	return {
		hotkeys,
	};
}
