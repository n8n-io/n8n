import { type Component, computed, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { canvasEventBus } from '@/features/canvas/canvas.eventBus';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import type { CommandGroup } from '../types';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getResourcePermissions } from '@n8n/permissions';
import NodeIcon from '@/components/NodeIcon.vue';
import CommandBarItemTitle from '@/features/ui/commandBar/components/CommandBarItemTitle.vue';

const ITEM_ID = {
	ADD_NODE: 'add-node',
	OPEN_NODE: 'open-node',
	ADD_STICKY: 'add-sticky',
} as const;

export function useNodeCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
}): CommandGroup {
	const i18n = useI18n();
	const { lastQuery } = options;

	const { addNodes, setNodeActive, editableWorkflow } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const sourceControlStore = useSourceControlStore();
	const workflowsStore = useWorkflowsStore();
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const isReadOnly = computed(() => sourceControlStore.preferences.branchReadOnly);
	const isArchived = computed(() => workflowsStore.workflow.isArchived);

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowsStore.workflow.scopes).workflow,
	);

	const hasPermission = (permission: keyof typeof workflowPermissions.value) =>
		(workflowPermissions.value[permission] === true && !isReadOnly.value && !isArchived.value) ||
		workflowsStore.isNewWorkflow;

	const addNodeCommands = computed<CommandBarItem[]>(() => {
		if (!hasPermission('update')) {
			return [];
		}

		const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
		const nodeTypes = nodeTypesStore.visibleNodeTypes;
		const { mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);
		return mergedNodes.map((node) => {
			const { name, displayName } = node;

			return {
				id: name,
				title: {
					component: CommandBarItemTitle,
					props: {
						title: displayName,
						actionText: i18n.baseText('generic.add'),
					},
				},
				keywords: [displayName],
				icon: {
					component: NodeIcon as Component,
					props: {
						nodeType: node,
						size: 16,
					},
				},
				handler: async () => {
					const nodes = await addNodes([{ type: name }]);
					if (nodes && nodes.length > 0) {
						canvasEventBus.emit('nodes:select', { ids: [nodes[0].id] });
					}
				},
			};
		});
	});

	const rootAddNodeCommandItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2) {
			return [];
		}

		return addNodeCommands.value;
	});

	const openNodeCommands = computed<CommandBarItem[]>(() => {
		return editableWorkflow.value.nodes.map((node) => {
			const { id, name, type } = node;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

			return {
				id,
				title: {
					component: CommandBarItemTitle,
					props: {
						title: name,
						actionText: i18n.baseText('generic.open'),
					},
				},
				section: i18n.baseText('commandBar.sections.nodes'),
				keywords: [name, type],
				icon: {
					component: NodeIcon,
					props: {
						nodeType,
						size: 16,
					},
				},
				handler: () => {
					setNodeActive(id, 'command_bar');
				},
				placeholder: i18n.baseText('commandBar.nodes.searchPlaceholder'),
			};
		});
	});

	const rootOpenNodeCommandItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2) {
			return [];
		}

		return openNodeCommands.value;
	});

	const nodeCommands = computed<CommandBarItem[]>(() => {
		return [
			...(hasPermission('update')
				? [
						{
							id: ITEM_ID.ADD_NODE,
							title: {
								component: CommandBarItemTitle,
								props: {
									title: i18n.baseText('commandBar.nodes.addNode'),
									shortcut: {
										keys: ['tab'],
									},
								},
							},
							keywords: [i18n.baseText('commandBar.nodes.addNode')],
							section: i18n.baseText('commandBar.sections.nodes'),
							placeholder: i18n.baseText('commandBar.nodes.searchPlaceholder'),
							children: [...addNodeCommands.value],
							icon: {
								component: N8nIcon,
								props: {
									icon: 'plus',
								},
							},
						},
					]
				: []),
			...rootAddNodeCommandItems.value,
			{
				id: ITEM_ID.OPEN_NODE,
				title: i18n.baseText('commandBar.nodes.openNode'),
				section: i18n.baseText('commandBar.sections.nodes'),
				children: [...openNodeCommands.value],
				placeholder: i18n.baseText('commandBar.nodes.searchPlaceholder'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'columns-3-cog',
					},
				},
			},
			...rootOpenNodeCommandItems.value,
			...(hasPermission('update')
				? [
						{
							id: ITEM_ID.ADD_STICKY,
							title: {
								component: CommandBarItemTitle,
								props: {
									title: i18n.baseText('commandBar.nodes.addStickyNote'),
									shortcut: {
										shiftKey: true,
										keys: ['s'],
									},
								},
							},
							section: i18n.baseText('commandBar.sections.nodes'),
							handler: () => {
								canvasEventBus.emit('create:sticky');
							},
							icon: {
								component: N8nIcon,
								props: {
									icon: 'sticky-note',
								},
							},
						},
					]
				: []),
		];
	});

	return {
		commands: nodeCommands,
	};
}
