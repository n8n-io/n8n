import { ref } from 'vue';
import { defineStore } from 'pinia';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getAllProjects,
	getProject,
	addProjectMembers,
	deleteProjectMember,
} from '@/features/collaboration/projects/projects.api';
import type {
	AgentAvatar,
	AgentNode,
	UserResponse,
	ZoneLayout,
	ConnectionLine,
} from './agents.types';

interface AgentDemoStats {
	role: string;
	status: 'idle' | 'active' | 'busy';
	tasksCompleted: number;
	lastActive: string;
	resourceUsage: number;
	workflowCount: number;
}

const AGENT_DEMO_STATS: Record<string, AgentDemoStats> = {
	'agent-docs-curator@internal.n8n.local': {
		role: 'Knowledge Base',
		status: 'idle',
		tasksCompleted: 47,
		lastActive: '12m ago',
		resourceUsage: 0.15,
		workflowCount: 2,
	},
	'agent-issue-triager@internal.n8n.local': {
		role: 'Bug Analysis',
		status: 'active',
		tasksCompleted: 128,
		lastActive: 'now',
		resourceUsage: 0.62,
		workflowCount: 3,
	},
	'agent-qa@internal.n8n.local': {
		role: 'Test Strategy',
		status: 'busy',
		tasksCompleted: 89,
		lastActive: '2m ago',
		resourceUsage: 0.84,
		workflowCount: 4,
	},
	'agent-messenger@internal.n8n.local': {
		role: 'Comms & Alerts',
		status: 'active',
		tasksCompleted: 213,
		lastActive: '1m ago',
		resourceUsage: 0.31,
		workflowCount: 1,
	},
};

function parseAvatar(avatarString: string | null | undefined, initials: string): AgentAvatar {
	if (!avatarString) {
		return { type: 'initials', value: initials || '??' };
	}
	if (avatarString.startsWith('http')) {
		return { type: 'image', value: avatarString };
	}
	return { type: 'emoji', value: avatarString };
}

const DEFAULT_POSITIONS: Array<{ x: number; y: number }> = [
	{ x: 80, y: 60 },
	{ x: 350, y: 60 },
	{ x: 80, y: 260 },
	{ x: 350, y: 260 },
];

const CANVAS_PADDING = 24;
const ZONE_GAP = 16;
const MIN_ZONE_HEIGHT = 160;
const ZONE_COLS = 2;

export const ZONE_COLORS = [
	'var(--color--primary)',
	'var(--color--success)',
	'var(--color--warning)',
	'var(--color--secondary)',
	'var(--color--danger)',
	'#8b5cf6',
];

export const useAgentsStore = defineStore('agents', () => {
	const agents = ref<AgentNode[]>([]);
	const zones = ref<ZoneLayout[]>([]);
	const connections = ref<ConnectionLine[]>([]);
	const selectedAgentId = ref<string | null>(null);
	const rootStore = useRootStore();

	const fetchAgents = async () => {
		const response = await makeRestApiRequest<{ items: UserResponse[] }>(
			rootStore.restApiContext,
			'GET',
			'/users',
			{ take: 100, skip: 0 },
		);

		const agentUsers = response.items.filter(
			(u) => u.type === 'agent' || u.email?.endsWith('@internal.n8n.local'),
		);

		agents.value = agentUsers.map((user, index) => {
			const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
			const stats = AGENT_DEMO_STATS[user.email] ?? {
				role: 'Agent',
				status: 'idle' as const,
				tasksCompleted: 0,
				lastActive: 'never',
				resourceUsage: 0,
				workflowCount: 0,
			};
			return {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: stats.role,
				avatar: parseAvatar(user.avatar, initials),
				status: stats.status,
				position: DEFAULT_POSITIONS[index % DEFAULT_POSITIONS.length],
				zoneId: null,
				workflowCount: stats.workflowCount,
				tasksCompleted: stats.tasksCompleted,
				lastActive: stats.lastActive,
				resourceUsage: stats.resourceUsage,
			};
		});
	};

	const updatePosition = (id: string, position: { x: number; y: number }) => {
		const agent = agents.value.find((a) => a.id === id);
		if (agent) {
			agent.position = position;
		}
	};

	function computeZoneRects(
		projectCount: number,
		canvasWidth: number,
		canvasHeight: number,
	): Array<{ x: number; y: number; width: number; height: number }> {
		const rows = Math.ceil(projectCount / ZONE_COLS);
		const zoneWidth = (canvasWidth - CANVAS_PADDING * 2 - ZONE_GAP * (ZONE_COLS - 1)) / ZONE_COLS;
		const zoneHeight = Math.max(
			MIN_ZONE_HEIGHT,
			(canvasHeight - CANVAS_PADDING * 2 - ZONE_GAP * (rows - 1)) / rows,
		);

		const rects: Array<{ x: number; y: number; width: number; height: number }> = [];
		for (let i = 0; i < projectCount; i++) {
			const col = i % ZONE_COLS;
			const row = Math.floor(i / ZONE_COLS);
			rects.push({
				x: CANVAS_PADDING + col * (zoneWidth + ZONE_GAP),
				y: CANVAS_PADDING + row * (zoneHeight + ZONE_GAP),
				width: zoneWidth,
				height: zoneHeight,
			});
		}
		return rects;
	}

	const fetchZones = async (canvasWidth: number, canvasHeight: number) => {
		const context = rootStore.restApiContext;
		const projects = await getAllProjects(context);
		const teamProjects = projects.filter((p) => p.type === 'team');

		const rects = computeZoneRects(teamProjects.length, canvasWidth, canvasHeight);

		const zoneLayouts: ZoneLayout[] = [];
		const projectDetails = await Promise.all(
			teamProjects.map(async (p) => await getProject(context, p.id)),
		);

		for (let i = 0; i < teamProjects.length; i++) {
			const project = teamProjects[i];
			const detail = projectDetails[i];

			zoneLayouts.push({
				projectId: project.id,
				name: project.name ?? 'Unnamed Project',
				icon: project.icon,
				memberCount: detail.relations.length,
				rect: rects[i],
				colorIndex: i % ZONE_COLORS.length,
			});

			for (const relation of detail.relations) {
				const agent = agents.value.find((a) => a.id === relation.id);
				if (agent) {
					agent.zoneId = project.id;
				}
			}
		}

		zones.value = zoneLayouts;
		positionAgentsInZones();
	};

	const recomputeZoneLayouts = (canvasWidth: number, canvasHeight: number) => {
		const rects = computeZoneRects(zones.value.length, canvasWidth, canvasHeight);
		zones.value = zones.value.map((zone, i) => ({
			...zone,
			rect: rects[i],
		}));
		positionAgentsInZones();
	};

	const positionAgentsInZones = () => {
		const agentsByZone = new Map<string, AgentNode[]>();
		for (const agent of agents.value) {
			if (agent.zoneId) {
				const list = agentsByZone.get(agent.zoneId) ?? [];
				list.push(agent);
				agentsByZone.set(agent.zoneId, list);
			}
		}

		for (const zone of zones.value) {
			const zoneAgents = agentsByZone.get(zone.projectId) ?? [];
			const startY = zone.rect.y + 48; // below header
			const startX = zone.rect.x + 16;
			for (let i = 0; i < zoneAgents.length; i++) {
				const col = i % 2;
				const row = Math.floor(i / 2);
				zoneAgents[i].position = {
					x: startX + col * 270,
					y: startY + row * 130,
				};
			}
		}
	};

	const assignAgentToZone = async (agentId: string, projectId: string) => {
		const agent = agents.value.find((a) => a.id === agentId);
		if (!agent) return;

		if (agent.zoneId === projectId) return;

		const previousZoneId = agent.zoneId;

		if (previousZoneId) {
			await deleteProjectMember(rootStore.restApiContext, previousZoneId, agentId);
		}

		await addProjectMembers(rootStore.restApiContext, projectId, [
			{ userId: agentId, role: 'project:editor' },
		]);

		agent.zoneId = projectId;

		const newZone = zones.value.find((z) => z.projectId === projectId);
		if (newZone) {
			newZone.memberCount++;
		}
		if (previousZoneId) {
			const oldZone = zones.value.find((z) => z.projectId === previousZoneId);
			if (oldZone) {
				oldZone.memberCount = Math.max(0, oldZone.memberCount - 1);
			}
		}

		positionAgentsInZones();
	};

	const removeAgentFromZone = async (agentId: string, projectId: string) => {
		const agent = agents.value.find((a) => a.id === agentId);
		if (!agent) return;

		await deleteProjectMember(rootStore.restApiContext, projectId, agentId);

		const zone = zones.value.find((z) => z.projectId === projectId);
		if (zone) {
			zone.memberCount = Math.max(0, zone.memberCount - 1);
		}

		agent.zoneId = null;
	};

	const selectAgent = (agentId: string) => {
		if (selectedAgentId.value === null) {
			selectedAgentId.value = agentId;
			return;
		}

		if (selectedAgentId.value === agentId) {
			selectedAgentId.value = null;
			return;
		}

		toggleConnection(selectedAgentId.value, agentId);
		selectedAgentId.value = null;
	};

	const toggleConnection = (fromId: string, toId: string) => {
		const sorted = [fromId, toId].sort();
		const id = `${sorted[0]}-${sorted[1]}`;

		const existingIndex = connections.value.findIndex((c) => c.id === id);
		if (existingIndex >= 0) {
			connections.value.splice(existingIndex, 1);
		} else {
			connections.value.push({
				id,
				fromAgentId: sorted[0],
				toAgentId: sorted[1],
			});
		}
	};

	const createAgent = async (firstName: string, avatar?: string) => {
		const response = await makeRestApiRequest<UserResponse>(
			rootStore.restApiContext,
			'POST',
			'/agents',
			{ firstName, avatar },
		);

		const initials =
			`${response.firstName?.[0] ?? ''}${response.lastName?.[0] ?? ''}`.toUpperCase();
		const newAgent: AgentNode = {
			id: response.id,
			firstName: response.firstName,
			lastName: response.lastName,
			email: response.email,
			role: 'Agent',
			avatar: parseAvatar(response.avatar, initials),
			status: 'idle',
			position: DEFAULT_POSITIONS[agents.value.length % DEFAULT_POSITIONS.length],
			zoneId: null,
			workflowCount: 0,
			tasksCompleted: 0,
			lastActive: 'never',
			resourceUsage: 0,
		};

		agents.value.push(newAgent);
		return newAgent;
	};

	const updateAgent = async (
		agentId: string,
		updates: { firstName?: string; avatar?: string | null },
	) => {
		const response = await makeRestApiRequest<UserResponse>(
			rootStore.restApiContext,
			'PATCH',
			`/agents/${agentId}`,
			updates,
		);

		const agent = agents.value.find((a) => a.id === agentId);
		if (agent) {
			if (response.firstName) {
				agent.firstName = response.firstName;
			}
			const initials =
				`${response.firstName?.[0] ?? ''}${response.lastName?.[0] ?? ''}`.toUpperCase();
			agent.avatar = parseAvatar(response.avatar, initials);
		}
	};

	const removeConnection = (lineId: string) => {
		const index = connections.value.findIndex((c) => c.id === lineId);
		if (index >= 0) {
			connections.value.splice(index, 1);
		}
	};

	return {
		agents,
		zones,
		connections,
		selectedAgentId,
		fetchAgents,
		updatePosition,
		fetchZones,
		recomputeZoneLayouts,
		positionAgentsInZones,
		assignAgentToZone,
		removeAgentFromZone,
		selectAgent,
		toggleConnection,
		removeConnection,
		createAgent,
		updateAgent,
	};
});
