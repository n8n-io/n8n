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
import { getNodeIcon, getNodeIconUrl } from '@/utils/nodeIcon';
import type { SimplifiedNodeType } from '@/Interface';
import type { CommandGroup } from './types';

function getIconSource(nodeType: SimplifiedNodeType | null, baseUrl: string) {
	if (!nodeType) return {};
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
				return {};
			}
			return { icon: path };
		}
	}
	return {};
}

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
						icon: 'plus',
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
						icon: 'columns-3-cog',
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
						icon: 'sticky-note',
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
