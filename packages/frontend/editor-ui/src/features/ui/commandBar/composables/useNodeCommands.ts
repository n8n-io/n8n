import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { canvasEventBus } from '@/features/canvas/canvas.eventBus';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { getNodeIcon, getNodeIconUrl } from '@/utils/nodeIcon';
import type { SimplifiedNodeType } from '@/Interface';
import type { CommandGroup } from '../commandBar.types';

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

export function useNodeCommands(): CommandGroup {
	const i18n = useI18n();
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

	const nodeCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'add-node',
				title: i18n.baseText('commandBar.nodes.addNode'),
				section: i18n.baseText('commandBar.sections.nodes'),
				children: [...addNodeCommands.value],
			},
			{
				id: 'add-sticky-note',
				title: i18n.baseText('commandBar.nodes.addStickyNote'),
				section: i18n.baseText('commandBar.sections.nodes'),
				handler: () => {
					canvasEventBus.emit('create:sticky');
				},
			},
			{
				id: 'open-node',
				title: i18n.baseText('commandBar.nodes.openNode'),
				section: i18n.baseText('commandBar.sections.nodes'),
				children: [...openNodeCommands.value],
			},
		];
	});

	return {
		commands: nodeCommands,
	};
}
