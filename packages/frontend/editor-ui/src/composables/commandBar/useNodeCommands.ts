import { computed, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { canvasEventBus } from '@/event-bus/canvas';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { getIconSource } from '@/utils/nodeIconUtils';
import type { CommandGroup } from './types';

const ITEM_ID = {
	ADD_NODE: 'add-node',
	OPEN_NODE: 'open-node',
	ADD_STICKY: 'add-sticky',
};

export function useNodeCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
}): CommandGroup {
	const i18n = useI18n();
	const { lastQuery } = options;

	const { addNodes, setNodeActive, editableWorkflow } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const rootStore = useRootStore();
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const addNodeCommands = computed<CommandBarItem[]>(() => {
		const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
		const nodeTypes = nodeTypesStore.visibleNodeTypes;
		const { mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);
		return mergedNodes.map((node) => {
			const { name, displayName } = node;
			const src = getIconSource(node, rootStore.baseUrl);
			return {
				id: name,
				title: i18n.baseText('commandBar.nodes.addNodeWithPrefix', {
					interpolate: { nodeName: displayName },
				}),
				keywords: [
					i18n.baseText('commandBar.nodes.keywords.insert'),
					i18n.baseText('commandBar.nodes.keywords.add'),
					i18n.baseText('commandBar.nodes.keywords.create'),
					i18n.baseText('commandBar.nodes.keywords.node'),
				],
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
			const src = getIconSource(nodeType, rootStore.baseUrl);
			return {
				id,
				title: i18n.baseText('commandBar.nodes.openNodeWithPrefix', {
					interpolate: { nodeName: name },
				}),
				section: i18n.baseText('commandBar.sections.nodes'),
				keywords: [type],
				icon: src?.path
					? {
							html: `<img src="${src.path}" style="width: 24px;object-fit: contain;height: 24px;" />`,
						}
					: undefined,
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
			{
				id: ITEM_ID.ADD_NODE,
				title: i18n.baseText('commandBar.nodes.addNode'),
				section: i18n.baseText('commandBar.sections.nodes'),
				placeholder: i18n.baseText('commandBar.nodes.searchPlaceholder'),
				children: [...addNodeCommands.value],
				icon: {
					component: N8nIcon,
					props: {
						icon: 'arrow-right',
					},
				},
			},
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
						icon: 'arrow-right',
					},
				},
			},
			...rootOpenNodeCommandItems.value,
			{
				id: ITEM_ID.ADD_STICKY,
				title: i18n.baseText('commandBar.nodes.addStickyNote'),
				section: i18n.baseText('commandBar.sections.nodes'),
				handler: () => {
					canvasEventBus.emit('create:sticky');
				},
				icon: {
					component: N8nIcon,
					props: {
						icon: 'plus',
					},
				},
			},
		];
	});

	function onCommandBarChange(query: string) {
		const trimmed = query.trim();
	}

	return {
		commands: nodeCommands,
		handlers: {
			onCommandBarChange,
		},
	};
}
