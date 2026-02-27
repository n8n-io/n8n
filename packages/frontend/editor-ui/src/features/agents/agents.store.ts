import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	getAllProjects,
	getProject,
	addProjectMembers,
	deleteProjectMember,
} from '@/features/collaboration/projects/projects.api';
import type {
	AgentAvatar,
	AgentNode,
	ExternalAgentNode,
	UserResponse,
	ZoneLayout,
	ConnectionLine,
} from './agents.types';

function parseAvatar(avatarString: string | null | undefined, initials: string): AgentAvatar {
	if (!avatarString) {
		return { type: 'initials', value: initials || '??' };
	}
	if (avatarString.startsWith('http')) {
		return { type: 'image', value: avatarString };
	}
	return { type: 'emoji', value: avatarString };
}

const CANVAS_PADDING = 24;
const ZONE_GAP = 16;
const ZONE_COLS = 2;
const CARD_W = 240;
const CARD_H = 110;
const CARD_GAP_X = 16;
const CARD_GAP_Y = 16;
const ZONE_PAD = 16;
const ZONE_HEADER_H = 48;

export const UNASSIGNED_ZONE_ID = '__unassigned__';
export const EXTERNAL_ZONE_ID = '__external__';
export const EXTERNAL_ZONE_COLOR = '#8b5cf6';

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
	const externalAgents = ref<ExternalAgentNode[]>([]);
	const zones = ref<ZoneLayout[]>([]);
	const connections = ref<ConnectionLine[]>([]);
	const selectedAgentId = ref<string | null>(null);
	const rootStore = useRootStore();

	const allAgents = computed<AgentNode[]>(() => [...agents.value, ...externalAgents.value]);

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

		agents.value = agentUsers.map((user) => {
			const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
			return {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: user.description ?? 'Agent',
				avatar: parseAvatar(user.avatar, initials),
				status: 'idle' as const,
				position: { x: 0, y: 0 }, // computed by layoutAndPosition
				zoneId: null,
				agentAccessLevel: user.agentAccessLevel ?? null,
				workflowCount: 0,
				tasksCompleted: 0,
				lastActive: 'never',
				resourceUsage: 0,
			};
		});
	};

	const updatePosition = (id: string, position: { x: number; y: number }) => {
		const agent =
			agents.value.find((a) => a.id === id) ?? externalAgents.value.find((a) => a.id === id);
		if (agent) {
			agent.position = position;
		}
	};

	/** Compute how tall a zone needs to be given the number of agents inside it and its width. */
	function zoneHeightForAgents(agentCount: number, zoneWidth: number): number {
		if (agentCount === 0) return ZONE_HEADER_H + CARD_H + ZONE_PAD * 2; // room for 1 row (drop target)
		const innerWidth = zoneWidth - ZONE_PAD * 2;
		const cols = Math.max(1, Math.floor((innerWidth + CARD_GAP_X) / (CARD_W + CARD_GAP_X)));
		const rows = Math.ceil(agentCount / cols);
		return ZONE_HEADER_H + ZONE_PAD + rows * CARD_H + (rows - 1) * CARD_GAP_Y + ZONE_PAD;
	}

	/**
	 * Layout all zones: unassigned zone (full width, top), then project zones in a 2-col grid,
	 * then external zone (full width, bottom — only when external agents exist).
	 * Each zone's height is driven by the number of agents inside it.
	 */
	function computeAllZoneRects(canvasWidth: number, agentCountByZone: Map<string, number>): void {
		const fullWidth = canvasWidth - CANVAS_PADDING * 2;
		let yOffset = CANVAS_PADDING;

		// Unassigned zone — full width at top
		const unassignedCount = agentCountByZone.get(UNASSIGNED_ZONE_ID) ?? 0;
		const unassignedIdx = zones.value.findIndex((z) => z.projectId === UNASSIGNED_ZONE_ID);
		if (unassignedIdx >= 0) {
			zones.value[unassignedIdx].rect = {
				x: CANVAS_PADDING,
				y: yOffset,
				width: fullWidth,
				height: zoneHeightForAgents(unassignedCount, fullWidth),
			};
			yOffset += zones.value[unassignedIdx].rect.height + ZONE_GAP;
		}

		// Project zones — 2-col grid
		const projectZones = zones.value.filter(
			(z) => z.projectId !== UNASSIGNED_ZONE_ID && z.projectId !== EXTERNAL_ZONE_ID,
		);
		const colWidth = (fullWidth - ZONE_GAP * (ZONE_COLS - 1)) / ZONE_COLS;

		// Group into rows of ZONE_COLS
		for (let i = 0; i < projectZones.length; i += ZONE_COLS) {
			const rowZones = projectZones.slice(i, i + ZONE_COLS);
			// Row height = tallest zone in the row
			const rowHeight = Math.max(
				...rowZones.map((z) => {
					const count = agentCountByZone.get(z.projectId) ?? 0;
					return zoneHeightForAgents(count, colWidth);
				}),
			);

			for (let col = 0; col < rowZones.length; col++) {
				rowZones[col].rect = {
					x: CANVAS_PADDING + col * (colWidth + ZONE_GAP),
					y: yOffset,
					width: colWidth,
					height: rowHeight,
				};
			}
			yOffset += rowHeight + ZONE_GAP;
		}

		// External zone — full width at bottom (only when external agents exist)
		const externalCount = agentCountByZone.get(EXTERNAL_ZONE_ID) ?? 0;
		const externalIdx = zones.value.findIndex((z) => z.projectId === EXTERNAL_ZONE_ID);
		if (externalIdx >= 0 && externalCount > 0) {
			zones.value[externalIdx].rect = {
				x: CANVAS_PADDING,
				y: yOffset,
				width: fullWidth,
				height: zoneHeightForAgents(externalCount, fullWidth),
			};
		} else if (externalIdx >= 0) {
			// Hide the zone when empty (zero-size rect)
			zones.value[externalIdx].rect = { x: 0, y: 0, width: 0, height: 0 };
		}
	}

	const fetchZones = async (canvasWidth: number) => {
		const context = rootStore.restApiContext;
		const projects = await getAllProjects(context);
		const teamProjects = projects.filter((p) => p.type === 'team');

		const zoneLayouts: ZoneLayout[] = [];

		// Unassigned zone first (colorIndex -1 signals neutral)
		zoneLayouts.push({
			projectId: UNASSIGNED_ZONE_ID,
			name: 'Unassigned',
			icon: null,
			memberCount: 0,
			rect: { x: 0, y: 0, width: 0, height: 0 }, // computed below
			colorIndex: -1,
		});

		const projectDetails = await Promise.all(
			teamProjects.map(async (p) => await getProject(context, p.id)),
		);

		for (let i = 0; i < teamProjects.length; i++) {
			const project = teamProjects[i];
			const detail = projectDetails[i];

			let agentMemberCount = 0;
			for (const relation of detail.relations) {
				const agent = agents.value.find((a) => a.id === relation.id);
				if (agent) {
					agent.zoneId = project.id;
					agentMemberCount++;
				}
			}

			zoneLayouts.push({
				projectId: project.id,
				name: project.name ?? 'Unnamed Project',
				icon: project.icon,
				memberCount: agentMemberCount,
				rect: { x: 0, y: 0, width: 0, height: 0 },
				colorIndex: i % ZONE_COLORS.length,
			});
		}

		// External zone — always present, hidden when empty (colorIndex -2 signals external)
		zoneLayouts.push({
			projectId: EXTERNAL_ZONE_ID,
			name: 'External Agents',
			icon: null,
			memberCount: externalAgents.value.length,
			rect: { x: 0, y: 0, width: 0, height: 0 },
			colorIndex: -2,
		});

		zones.value = zoneLayouts;
		layoutAndPosition(canvasWidth);
	};

	const recomputeZoneLayouts = (canvasWidth: number) => {
		layoutAndPosition(canvasWidth);
	};

	/** Compute zone sizes, then position agents inside them. */
	const layoutAndPosition = (canvasWidth: number) => {
		// Count agents per zone (unassigned agents go to the unassigned zone)
		const countByZone = new Map<string, number>();
		for (const agent of agents.value) {
			const key = agent.zoneId ?? UNASSIGNED_ZONE_ID;
			countByZone.set(key, (countByZone.get(key) ?? 0) + 1);
		}
		// External agents always go to the external zone
		countByZone.set(EXTERNAL_ZONE_ID, externalAgents.value.length);

		// Update unassigned zone member count
		const unassigned = zones.value.find((z) => z.projectId === UNASSIGNED_ZONE_ID);
		if (unassigned) {
			unassigned.memberCount = countByZone.get(UNASSIGNED_ZONE_ID) ?? 0;
		}

		// Update external zone member count
		const externalZone = zones.value.find((z) => z.projectId === EXTERNAL_ZONE_ID);
		if (externalZone) {
			externalZone.memberCount = externalAgents.value.length;
		}

		// Compute zone rects based on content
		computeAllZoneRects(canvasWidth, countByZone);

		// Position all agents (local + external) in a grid within their zone
		const agentsByZone = new Map<string, AgentNode[]>();
		for (const agent of agents.value) {
			const key = agent.zoneId ?? UNASSIGNED_ZONE_ID;
			const list = agentsByZone.get(key) ?? [];
			list.push(agent);
			agentsByZone.set(key, list);
		}
		// External agents in external zone
		if (externalAgents.value.length > 0) {
			agentsByZone.set(EXTERNAL_ZONE_ID, [...externalAgents.value]);
		}

		for (const zone of zones.value) {
			const zoneAgents = agentsByZone.get(zone.projectId) ?? [];
			if (zone.rect.width === 0) continue; // hidden zone
			const innerWidth = zone.rect.width - ZONE_PAD * 2;
			const cols = Math.max(1, Math.floor((innerWidth + CARD_GAP_X) / (CARD_W + CARD_GAP_X)));
			const startX = zone.rect.x + ZONE_PAD;
			const startY = zone.rect.y + ZONE_HEADER_H + ZONE_PAD;

			for (let i = 0; i < zoneAgents.length; i++) {
				const col = i % cols;
				const row = Math.floor(i / cols);
				zoneAgents[i].position = {
					x: startX + col * (CARD_W + CARD_GAP_X),
					y: startY + row * (CARD_H + CARD_GAP_Y),
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

	const createAgent = async (
		firstName: string,
		avatar?: string,
		agentAccessLevel?: 'external' | 'internal' | 'closed',
	) => {
		const response = await makeRestApiRequest<UserResponse>(
			rootStore.restApiContext,
			'POST',
			'/agents',
			{ firstName, avatar, agentAccessLevel },
		);

		const initials =
			`${response.firstName?.[0] ?? ''}${response.lastName?.[0] ?? ''}`.toUpperCase();
		const newAgent: AgentNode = {
			id: response.id,
			firstName: response.firstName,
			lastName: response.lastName,
			email: response.email,
			role: response.description ?? 'Agent',
			avatar: parseAvatar(response.avatar, initials),
			status: 'idle',
			position: { x: 0, y: 0 }, // computed by layoutAndPosition
			zoneId: null,
			workflowCount: 0,
			tasksCompleted: 0,
			lastActive: 'never',
			resourceUsage: 0,
		};

		agents.value.push(newAgent);
		return { agent: newAgent, apiKey: response.apiKey };
	};

	const updateAgent = async (
		agentId: string,
		updates: {
			firstName?: string;
			avatar?: string | null;
			agentAccessLevel?: 'external' | 'internal' | 'closed';
		},
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
			if (response.agentAccessLevel !== undefined) {
				agent.agentAccessLevel = response.agentAccessLevel ?? null;
			}
		}
	};

	const removeConnection = (lineId: string) => {
		const index = connections.value.findIndex((c) => c.id === lineId);
		if (index >= 0) {
			connections.value.splice(index, 1);
		}
	};

	const setAgentStatus = (id: string, status: 'idle' | 'active' | 'busy') => {
		const agent =
			agents.value.find((a) => a.id === id) ?? externalAgents.value.find((a) => a.id === id);
		if (agent) {
			agent.status = status;
		}
	};

	const setAgentStatusByName = (firstName: string, status: 'idle' | 'active' | 'busy') => {
		const agent =
			agents.value.find((a) => a.firstName.toLowerCase() === firstName.toLowerCase()) ??
			externalAgents.value.find((a) => a.firstName.toLowerCase() === firstName.toLowerCase());
		if (agent) {
			agent.status = status;
		}
	};

	interface RemoteAgentCard {
		name?: string;
		description?: string;
		provider?: { name?: string; description?: string };
		url?: string;
		interfaces?: Array<{ url?: string }>;
		skills?: Array<{ id: string; name: string; description?: string }>;
		capabilities?: { streaming?: boolean; multiTurn?: boolean };
		requiredCredentials?: Array<{ type: string; description: string }>;
	}

	const registerExternalAgent = async (url: string, apiKey: string) => {
		const card = await makeRestApiRequest<RemoteAgentCard>(
			rootStore.restApiContext,
			'POST',
			'/agents/discover',
			{ url, apiKey },
		);

		// Extract agent ID from the card's interface URL (e.g. /agents/<id>/task)
		const interfaceUrl = card.interfaces?.[0]?.url ?? '';
		const remoteIdMatch = /\/agents\/([^/]+)/.exec(interfaceUrl);
		const remoteAgentId = remoteIdMatch?.[1] ?? 'unknown';
		const localId = `ext-${remoteAgentId}`;

		// Don't add duplicates
		if (externalAgents.value.some((a) => a.id === localId)) {
			return externalAgents.value.find((a) => a.id === localId)!;
		}

		const name = card.name ?? 'Remote Agent';
		const description = card.provider?.description ?? card.description ?? '';
		const skills = (card.skills ?? []).map((s) => ({
			name: s.name,
			description: s.description,
		}));

		const initials = name.slice(0, 2).toUpperCase();
		const newAgent: ExternalAgentNode = {
			id: localId,
			firstName: name,
			lastName: '',
			email: '',
			role: description || 'External Agent',
			avatar: { type: 'initials', value: initials },
			status: 'idle',
			position: { x: 0, y: 0 },
			zoneId: EXTERNAL_ZONE_ID,
			workflowCount: 0,
			tasksCompleted: 0,
			lastActive: 'never',
			resourceUsage: 0,
			external: true,
			remoteUrl: url.replace(/\/+$/, ''),
			remoteAgentId,
			apiKey,
			skills,
			remoteCapabilities: {
				streaming: card.capabilities?.streaming ?? false,
				multiTurn: card.capabilities?.multiTurn ?? false,
			},
			requiredCredentials: card.requiredCredentials ?? [],
		};

		externalAgents.value.push(newAgent);
		return newAgent;
	};

	const removeExternalAgent = (id: string) => {
		const idx = externalAgents.value.findIndex((a) => a.id === id);
		if (idx >= 0) {
			externalAgents.value.splice(idx, 1);
		}
	};

	const pushListenerRemoval = ref<(() => void) | null>(null);

	const initializePushListener = () => {
		if (pushListenerRemoval.value) return;

		const pushStore = usePushConnectionStore();
		pushStore.pushConnect();

		pushListenerRemoval.value = pushStore.addEventListener((event) => {
			if (event.type === 'agentTaskStep') {
				const stepEvent = event.data.event as Record<string, unknown>;
				// Only activate on new actions (type: step), not results (type: observation)
				if (stepEvent.type === 'step') {
					setAgentStatus(event.data.agentId, 'active');
					if (stepEvent.action === 'send_message' && typeof stepEvent.toAgent === 'string') {
						setAgentStatusByName(stepEvent.toAgent, 'active');
					}
				}
			}
			if (event.type === 'agentTaskDone') {
				// Reset all agents — sub-agent done events may arrive before
				// the parent's observation, so reset everything to avoid stale state
				for (const agent of agents.value) {
					agent.status = 'idle';
				}
				for (const agent of externalAgents.value) {
					agent.status = 'idle';
				}
			}
		});
	};

	const teardownPushListener = () => {
		if (typeof pushListenerRemoval.value === 'function') {
			pushListenerRemoval.value();
			pushListenerRemoval.value = null;
		}
		const pushStore = usePushConnectionStore();
		pushStore.pushDisconnect();
	};

	return {
		agents,
		externalAgents,
		allAgents,
		zones,
		connections,
		selectedAgentId,
		fetchAgents,
		updatePosition,
		fetchZones,
		recomputeZoneLayouts,
		layoutAndPosition,
		assignAgentToZone,
		removeAgentFromZone,
		selectAgent,
		toggleConnection,
		removeConnection,
		createAgent,
		updateAgent,
		registerExternalAgent,
		removeExternalAgent,
		setAgentStatus,
		setAgentStatusByName,
		initializePushListener,
		teardownPushListener,
	};
});
