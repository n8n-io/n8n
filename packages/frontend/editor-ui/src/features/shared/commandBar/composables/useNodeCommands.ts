import { type Component, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { STICKY_NODE_TYPE } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useActionsGenerator } from '@/features/shared/nodeCreator/composables/useActionsGeneration';
import { isNodeItemRestricted } from '@/features/shared/nodeCreator/nodeCreator.utils';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import type { CommandBarItem, CommandBarSearchRequest, CommandGroup } from '../types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { getResourcePermissions } from '@n8n/permissions';
import NodeIcon from '@/app/components/NodeIcon.vue';
import type { INodeUi, SimplifiedNodeType } from '@/Interface';
import { paginate, rankItems } from '../commandBar.utils';

const ITEM_ID = {
	ADD_STICKY: 'add-sticky',
} as const;

export function useNodeCommands(): CommandGroup {
	const i18n = useI18n();

	const { addNodes, setNodeActive } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const sourceControlStore = useSourceControlStore();
	const workflowsStore = useWorkflowsStore();
	const collaborationStore = useCollaborationStore();
	const { generateMergedNodesAndActions } = useActionsGenerator();

	const workflowDocumentStore = injectWorkflowDocumentStore();

	const isReadOnly = computed(
		() => sourceControlStore.preferences.branchReadOnly || collaborationStore.shouldBeReadOnly,
	);
	const isArchived = computed(() => workflowDocumentStore.value.isArchived);

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowDocumentStore.value.scopes).workflow,
	);

	const hasPermission = (permission: keyof typeof workflowPermissions.value) =>
		(workflowPermissions.value[permission] === true && !isReadOnly.value && !isArchived.value) ||
		!workflowsStore.isWorkflowSaved[workflowsStore.workflowId];

	// Restricted types stay listed, like in the nodes panel: greyed, locked, last, and inert.
	const mergedNodes = computed(() => {
		const httpOnlyCredentials = credentialsStore.httpOnlyCredentialTypes;
		const nodeTypes = nodeTypesStore.visibleNodeTypes;
		const nodes = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials).mergedNodes;
		const restricted = new Set(nodes.filter((node) => isNodeItemRestricted(node.name)));
		return [...nodes.filter((node) => !restricted.has(node)), ...restricted];
	});

	const buildAddNodeItem = (node: SimplifiedNodeType): CommandBarItem => ({
		id: node.name,
		title: node.displayName,
		section: i18n.baseText('commandBar.nodes.addNode'),
		disabled: isNodeItemRestricted(node.name),
		keywords: node.codex?.alias ?? [],
		icon: {
			component: NodeIcon as Component,
			props: {
				nodeType: node,
				size: 16,
			},
		},
		handler: async () => {
			const nodes = await addNodes([{ type: node.name }]);
			if (nodes && nodes.length > 0) {
				canvasEventBus.emit('nodes:select', { ids: [nodes[0].id] });
			}
		},
	});

	const buildOpenNodeItem = (node: INodeUi): CommandBarItem => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

		return {
			id: node.id,
			title: node.name,
			description: nodeType?.displayName,
			section: i18n.baseText('commandBar.nodes.inWorkflow'),
			keywords: [node.type, ...(nodeType ? [nodeType.displayName] : [])],
			icon: {
				component: NodeIcon,
				props: {
					nodeType,
					size: 16,
				},
			},
			handler: () => {
				setNodeActive(node.id, 'command_bar');
			},
		};
	};

	const openNodeItems = computed(() =>
		workflowDocumentStore.value.allNodes.map((node) => buildOpenNodeItem(node)),
	);

	const addNodeItems = computed(() =>
		hasPermission('update') ? mergedNodes.value.map((node) => buildAddNodeItem(node)) : [],
	);

	function search({ query, offset, limit }: CommandBarSearchRequest) {
		const rankedAddNodeItems = rankItems(addNodeItems.value, query);
		const ranked = [
			...rankItems(openNodeItems.value, query),
			...rankedAddNodeItems.filter((item) => !item.disabled),
			...rankedAddNodeItems.filter((item) => item.disabled),
		];
		return paginate(ranked, { offset, limit });
	}

	const nodeCommands = computed<CommandBarItem[]>(() => {
		if (!hasPermission('update') || nodeTypesStore.isNodeTypeUnavailable(STICKY_NODE_TYPE)) {
			return [];
		}

		return [
			{
				id: ITEM_ID.ADD_STICKY,
				title: i18n.baseText('commandBar.nodes.addStickyNote'),
				shortcut: {
					shiftKey: true,
					keys: ['s'],
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
		];
	});

	return {
		commands: nodeCommands,
		source: {
			id: 'nodes',
			title: i18n.baseText('commandBar.sections.nodes'),
			isRemote: false,
			isAvailable: () => true,
			search,
		},
	};
}
