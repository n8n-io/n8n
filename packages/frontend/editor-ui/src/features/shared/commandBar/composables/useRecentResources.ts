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
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
} from '@/features/agents/constants';
import { listAgentsPageGlobal } from '@/features/agents/composables/useAgentApi';
import type { AgentResource } from '@/features/agents/types';

const MAX_RECENT_ITEMS = 5;
const MAX_RECENT_WORKFLOWS_TO_DISPLAY = 5;
const RECENT_NODES_STORAGE_KEY = 'n8n-recent-nodes';
const RECENT_AGENTS_STORAGE_KEY = 'n8n-recent-agents';
const AGENT_VIEWS: unknown[] = [
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
];

interface RecentNode {
	nodeId: string;
	openedAt: number;
}

type RecentNodesMap = Record<string, RecentNode[]>;

interface RecentResourceOpen {
	id: string;
	openedAt: number;
}

interface RecentEntry {
	resourceId: string;
	openedAt: number;
	item: CommandBarItem;
}

export function useRecentResources(): CommandGroup & {
	trackResourceOpened: (to: RouteLocationNormalized) => void;
} {
	const i18n = useI18n();
	const router = useRouter();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const nodeTypesStore = useNodeTypesStore();
	const recentWorkflowsStore = useRecentWorkflowsStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const { setNodeActive } = useCanvasOperations();

	const recentNodes = useLocalStorage<RecentNodesMap>(RECENT_NODES_STORAGE_KEY, {});
	const recentAgentOpens = useLocalStorage<RecentResourceOpen[]>(RECENT_AGENTS_STORAGE_KEY, []);
	const recentWorkflowEntries = ref<RecentEntry[]>([]);
	const recentAgentEntries = ref<RecentEntry[]>([]);

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

		if (AGENT_VIEWS.includes(to.name) && typeof to.params.agentId === 'string') {
			registerAgentOpen(to.params.agentId);
		}
	}

	function registerAgentOpen(agentId: string): void {
		recentAgentOpens.value = [
			{ id: agentId, openedAt: Date.now() },
			...recentAgentOpens.value.filter(({ id }) => id !== agentId),
		].slice(0, MAX_RECENT_WORKFLOWS_TO_DISPLAY + 1);
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

	const currentAgentId = computed(() => {
		const currentRoute = router.currentRoute.value;
		return AGENT_VIEWS.includes(currentRoute.name) &&
			typeof currentRoute.params.agentId === 'string'
			? currentRoute.params.agentId
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

	const toWorkflowItem = (workflow: IWorkflowDb): CommandBarItem => {
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
	};

	const toAgentItem = (agent: AgentResource): CommandBarItem => {
		const location = {
			name: AGENT_BUILDER_VIEW,
			params: { projectId: agent.projectId, agentId: agent.id },
		};

		return {
			id: `recent-agent-${agent.id}`,
			title: agent.name,
			section: i18n.baseText('commandBar.sections.recent'),
			icon: { type: 'icon', value: 'bot' },
			href: router.resolve(location).href,
			handler: () => {
				void router.push(location);
			},
		};
	};

	const recentResourceItems = computed<CommandBarItem[]>(() =>
		[...recentWorkflowEntries.value, ...recentAgentEntries.value]
			.filter(
				({ resourceId }) =>
					resourceId !== currentWorkflowId.value && resourceId !== currentAgentId.value,
			)
			.sort((a, b) => b.openedAt - a.openedAt)
			.slice(0, MAX_RECENT_WORKFLOWS_TO_DISPLAY)
			.map(({ item }) => item),
	);

	const recentResourceCommands = computed<CommandBarItem[]>(() => [
		...recentNodeCommands.value,
		...recentResourceItems.value,
	]);

	async function initialize() {
		await Promise.all([loadRecentWorkflows(), loadRecentAgents()]);
	}

	async function loadRecentWorkflows() {
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
		recentWorkflowEntries.value = recentOpens.flatMap(({ id, openedAt }) => {
			const workflow = workflowsById.get(id);
			return workflow ? { resourceId: id, openedAt, item: toWorkflowItem(workflow) } : [];
		});
	}

	async function loadRecentAgents() {
		const recentOpens = recentAgentOpens.value;
		if (!settingsStore.isAgentsEnabled || recentOpens.length === 0) return;

		const agents = await listAgentsPageGlobal(rootStore.restApiContext, {
			skip: 0,
			take: recentOpens.length,
			filter: { ids: recentOpens.map(({ id }) => id) },
		}).catch(() => undefined);
		if (!agents) return;

		const agentsById = new Map(agents.data.map((agent) => [agent.id, agent]));
		recentAgentEntries.value = recentOpens.flatMap(({ id, openedAt }) => {
			const agent = agentsById.get(id);
			return agent ? { resourceId: id, openedAt, item: toAgentItem(agent) } : [];
		});
	}

	return {
		commands: recentResourceCommands,
		trackResourceOpened,
		initialize,
	};
}
