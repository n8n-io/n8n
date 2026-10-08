import { computed, ref, type Component } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';
import type { CommandBarItem, CommandGroup } from '../types';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';
import { VIEWS } from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';

const MAX_RECENT_ITEMS = 5;
const MAX_RECENT_WORKFLOWS_TO_DISPLAY = 5;
const RECENT_NODES_STORAGE_KEY = 'n8n-recent-nodes';

interface RecentNode {
	nodeId: string;
	openedAt: number;
}

type RecentNodesMap = Record<string, RecentNode[]>;

export function useRecentResources(): CommandGroup & {
	trackResourceOpened: (to: RouteLocationNormalized) => void;
} {
	const i18n = useI18n();
	const router = useRouter();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const nodeTypesStore = useNodeTypesStore();
	const recentWorkflowsStore = useRecentWorkflowsStore();
	const { setNodeActive } = useCanvasOperations();

	const recentNodes = useLocalStorage<RecentNodesMap>(RECENT_NODES_STORAGE_KEY, {});
	const recentWorkflows = ref<IWorkflowDb[]>([]);

	function trackResourceOpened(to: RouteLocationNormalized): void {
		if (to.name === VIEWS.WORKFLOW && typeof to.params.workflowId === 'string') {
			const workflowId = to.params.workflowId;
			const isNewWorkflow = to.query.new === 'true';
			// Check if it's a valid workflow ID (not empty and exists)
			if (workflowId && !isNewWorkflow) {
				registerWorkflowOpen(workflowId);

				if (typeof to.params.nodeId === 'string' && to.params.nodeId) {
					registerNodeOpen(workflowId, to.params.nodeId);
				}
			}
		}
	}

	function registerWorkflowOpen(workflowId: string): void {
		// Workflow routes have no authoritative project ID. Keep the entry unscoped
		// until a project-scoped workflow query validates it.
		recentWorkflowsStore.registerWorkflowOpen(workflowId);
	}

	function registerNodeOpen(workflowId: string, nodeId: string): void {
		const currentWorkflowNodes = recentNodes.value[workflowId] ?? [];

		const filtered = currentWorkflowNodes.filter((n) => n.nodeId !== nodeId);

		const updatedNodes = [
			{
				nodeId,
				openedAt: Date.now(),
			},
			...filtered,
		].slice(0, MAX_RECENT_ITEMS);

		recentNodes.value = {
			...recentNodes.value,
			[workflowId]: updatedNodes,
		};
	}

	const currentWorkflowId = computed(() => {
		const currentRoute = router.currentRoute.value;
		return currentRoute.name === VIEWS.WORKFLOW &&
			typeof currentRoute.params.workflowId === 'string'
			? currentRoute.params.workflowId
			: null;
	});

	const recentNodeCommands = computed<CommandBarItem[]>(() => {
		const workflowId = currentWorkflowId.value;
		if (!workflowId) return [];

		return (recentNodes.value[workflowId] ?? []).flatMap((recentNode) => {
			const node = workflowDocumentStore.value.findNodeByPartialId(recentNode.nodeId);
			if (!node) return [];

			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

			return {
				id: `recent-node-${workflowId}-${recentNode.nodeId}`,
				title: node.name,
				description: nodeType?.displayName,
				section: i18n.baseText('commandBar.sections.recent'),
				icon: {
					component: NodeIcon as Component,
					props: {
						nodeType,
						size: 16,
					},
				},
				handler: () => {
					const currentNode = workflowDocumentStore.value.findNodeByPartialId(recentNode.nodeId);
					if (currentNode) {
						setNodeActive(currentNode.id, 'command_bar');
					}
				},
			};
		});
	});

	const recentWorkflowCommands = computed<CommandBarItem[]>(() =>
		recentWorkflows.value
			.filter((workflow) => workflow.id !== currentWorkflowId.value)
			.slice(0, MAX_RECENT_WORKFLOWS_TO_DISPLAY)
			.map((workflow) => {
				const { href } = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId: workflow.id },
				});

				return {
					id: `recent-workflow-${workflow.id}`,
					title: workflow.name || i18n.baseText('commandBar.workflows.unnamed'),
					section: i18n.baseText('commandBar.sections.recent'),
					icon: { type: 'icon', value: 'workflow' },
					href,
					handler: () => {
						window.location.href = href;
					},
				};
			}),
	);

	const recentResourceCommands = computed<CommandBarItem[]>(() => [
		...recentNodeCommands.value,
		...recentWorkflowCommands.value,
	]);

	async function initialize() {
		const recentOpens = recentWorkflowsStore.globalRecentWorkflowOpens.slice(
			0,
			MAX_RECENT_WORKFLOWS_TO_DISPLAY + 1,
		);
		if (recentOpens.length === 0) return;

		const workflows = await workflowsListStore
			.searchWorkflows({
				ids: recentOpens.map(({ id }) => id),
				isArchived: false,
				select: ['id', 'name'],
				options: { skip: 0, take: recentOpens.length, includeScopes: false },
			})
			.catch(() => undefined);
		if (!workflows) return;

		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		recentWorkflows.value = recentOpens
			.map(({ id }) => workflowsById.get(id))
			.filter((workflow): workflow is IWorkflowDb => workflow !== undefined);
	}

	return {
		commands: recentResourceCommands,
		trackResourceOpened,
		initialize,
	};
}
