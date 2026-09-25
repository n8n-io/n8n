import { computed, type Component } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';
import type { CommandBarItem } from '../types';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';
import { VIEWS } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';

const MAX_RECENT_ITEMS = 5;
const MAX_RECENT_WORKFLOWS_TO_DISPLAY = 3;
const RECENT_NODES_STORAGE_KEY = 'n8n-recent-nodes';

interface RecentNode {
	nodeId: string;
	openedAt: number;
}

type RecentNodesMap = Record<string, RecentNode[]>;

export function useRecentResources() {
	const i18n = useI18n();
	const router = useRouter();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const nodeTypesStore = useNodeTypesStore();
	const recentWorkflowsStore = useRecentWorkflowsStore();
	const { setNodeActive } = useCanvasOperations();

	const recentNodes = useLocalStorage<RecentNodesMap>(RECENT_NODES_STORAGE_KEY, {});

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

	const recentResourceCommands = computed<CommandBarItem[]>(() => {
		const items: CommandBarItem[] = [];

		const currentRoute = router.currentRoute.value;
		const currentWorkflowId =
			currentRoute.name === VIEWS.WORKFLOW && typeof currentRoute.params.workflowId === 'string'
				? currentRoute.params.workflowId
				: null;

		if (currentWorkflowId && recentNodes.value[currentWorkflowId]) {
			const nodesForWorkflow = recentNodes.value[currentWorkflowId];

			for (const recentNode of nodesForWorkflow) {
				const node = workflowDocumentStore.value.findNodeByPartialId(recentNode.nodeId);
				if (!node) {
					continue;
				}

				const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

				items.push({
					id: `recent-node-${currentWorkflowId}-${recentNode.nodeId}`,
					title: i18n.baseText('generic.openResource', {
						interpolate: { resource: node.name },
					}),
					section: i18n.baseText('commandBar.sections.recent'),
					icon: {
						component: NodeIcon as Component,
						props: {
							nodeType,
							size: 16,
						},
					},
					handler: () => {
						const node = workflowDocumentStore.value.findNodeByPartialId(recentNode.nodeId);
						if (node) {
							setNodeActive(node.id, 'command_bar');
						}
					},
				});
			}
		}

		if (recentWorkflowsStore.globalRecentWorkflowOpens.length > 0) {
			let workflowsAdded = 0;

			for (const recentWorkflow of recentWorkflowsStore.globalRecentWorkflowOpens) {
				// Stop if we've reached the display limit
				if (workflowsAdded >= MAX_RECENT_WORKFLOWS_TO_DISPLAY) {
					break;
				}

				// Get workflow from store (will be loaded by initialize())
				const workflow = workflowsListStore.getWorkflowById(recentWorkflow.id);
				if (!workflow) {
					continue;
				}

				items.push({
					id: `recent-workflow-${recentWorkflow.id}`,
					title: i18n.baseText('generic.openResource', {
						interpolate: {
							resource: workflow.name || i18n.baseText('commandBar.workflows.unnamed'),
						},
					}),
					section: i18n.baseText('commandBar.sections.recent'),
					icon: {
						component: N8nIcon,
						props: {
							icon: 'arrow-right',
						},
					},
					handler: () => {
						const targetRoute = router.resolve({
							name: VIEWS.WORKFLOW,
							params: { workflowId: recentWorkflow.id },
						});
						window.location.href = targetRoute.fullPath;
					},
				});

				workflowsAdded++;
			}
		}

		return items;
	});

	async function initialize() {
		const workflowsToFetch = recentWorkflowsStore.globalRecentWorkflowOpens.slice(
			0,
			MAX_RECENT_WORKFLOWS_TO_DISPLAY,
		);

		await Promise.all(
			workflowsToFetch.map(async (recentWorkflow) => {
				try {
					const workflow = workflowsListStore.getWorkflowById(recentWorkflow.id);

					if (!workflow) {
						await workflowsListStore.fetchWorkflow(recentWorkflow.id);
					}
				} catch {
					// If fetch fails, skip this workflow (it may have been deleted)
				}
			}),
		);
	}

	return {
		commands: recentResourceCommands,
		trackResourceOpened,
		initialize,
	};
}
