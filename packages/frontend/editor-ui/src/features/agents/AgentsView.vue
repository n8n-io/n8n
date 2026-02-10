<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useAgentsStore, ZONE_COLORS } from './agents.store';
import { useAgentPanelStore } from './agentPanel.store';
import AgentCard from './AgentCard.vue';
import PermissionZone from './components/PermissionZone.vue';
import ConnectionLines from './components/ConnectionLines.vue';
import AgentActionPanel from './components/AgentActionPanel.vue';

const DRAG_THRESHOLD = 5;
const CARD_WIDTH = 240;
const CARD_HEIGHT = 110;

const agentsStore = useAgentsStore();
const panelStore = useAgentPanelStore();
const canvasRef = ref<HTMLElement>();

const showAddDialog = ref(false);
const newAgentName = ref('');
const newAgentAvatar = ref('');
const isCreating = ref(false);

async function onCreateAgent() {
	const name = newAgentName.value.trim();
	if (!name) return;

	isCreating.value = true;
	try {
		const avatar = newAgentAvatar.value.trim() || undefined;
		await agentsStore.createAgent(name, avatar);

		if (canvasRef.value) {
			const { clientWidth, clientHeight } = canvasRef.value;
			await agentsStore.fetchZones(clientWidth, clientHeight);
		}

		newAgentName.value = '';
		newAgentAvatar.value = '';
		showAddDialog.value = false;
	} finally {
		isCreating.value = false;
	}
}

function onCancelAdd() {
	showAddDialog.value = false;
	newAgentName.value = '';
	newAgentAvatar.value = '';
}

let dragState: {
	agentId: string;
	offsetX: number;
	offsetY: number;
	startX: number;
	startY: number;
	moved: boolean;
	shiftKey: boolean;
} | null = null;

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
	await agentsStore.fetchAgents();

	if (canvasRef.value) {
		const { clientWidth, clientHeight } = canvasRef.value;
		await agentsStore.fetchZones(clientWidth, clientHeight);

		resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				agentsStore.recomputeZoneLayouts(entry.contentRect.width, entry.contentRect.height);
			}
		});
		resizeObserver.observe(canvasRef.value);
	}
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
});

function getZoneColor(agentId: string): string | null {
	const agent = agentsStore.agents.find((a) => a.id === agentId);
	if (!agent?.zoneId) return null;
	const zone = agentsStore.zones.find((z) => z.projectId === agent.zoneId);
	if (!zone) return null;
	return ZONE_COLORS[zone.colorIndex % ZONE_COLORS.length];
}

function onDragStart(agentId: string, event: PointerEvent) {
	const agent = agentsStore.agents.find((a) => a.id === agentId);
	if (!agent || !canvasRef.value) return;

	const canvasRect = canvasRef.value.getBoundingClientRect();
	dragState = {
		agentId,
		offsetX: event.clientX - canvasRect.left - agent.position.x,
		offsetY: event.clientY - canvasRect.top - agent.position.y,
		startX: event.clientX,
		startY: event.clientY,
		moved: false,
		shiftKey: event.shiftKey,
	};

	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(event: PointerEvent) {
	if (!dragState || !canvasRef.value) return;

	if (!dragState.moved) {
		const dx = Math.abs(event.clientX - dragState.startX);
		const dy = Math.abs(event.clientY - dragState.startY);
		if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
		dragState.moved = true;
	}

	const canvasRect = canvasRef.value.getBoundingClientRect();
	const x = event.clientX - canvasRect.left - dragState.offsetX;
	const y = event.clientY - canvasRect.top - dragState.offsetY;

	agentsStore.updatePosition(dragState.agentId, {
		x: Math.max(0, x),
		y: Math.max(0, y),
	});
}

function hitTestZone(centerX: number, centerY: number): string | null {
	for (const zone of agentsStore.zones) {
		const r = zone.rect;
		if (centerX >= r.x && centerX <= r.x + r.width && centerY >= r.y && centerY <= r.y + r.height) {
			return zone.projectId;
		}
	}
	return null;
}

async function onPointerUp() {
	if (!dragState) return;

	const { agentId, moved, shiftKey } = dragState;
	dragState = null;
	window.removeEventListener('pointermove', onPointerMove);
	window.removeEventListener('pointerup', onPointerUp);

	if (!moved) {
		if (shiftKey) {
			agentsStore.selectAgent(agentId);
		} else {
			void panelStore.openPanel(agentId);
		}
		return;
	}

	const agent = agentsStore.agents.find((a) => a.id === agentId);
	if (!agent) return;

	const centerX = agent.position.x + CARD_WIDTH / 2;
	const centerY = agent.position.y + CARD_HEIGHT / 2;
	const targetZoneId = hitTestZone(centerX, centerY);

	if (targetZoneId && targetZoneId !== agent.zoneId) {
		await agentsStore.assignAgentToZone(agentId, targetZoneId);
	} else if (!targetZoneId && agent.zoneId) {
		await agentsStore.removeAgentFromZone(agentId, agent.zoneId);
	}
}

function onRemoveConnection(lineId: string) {
	agentsStore.removeConnection(lineId);
}
</script>

<template>
	<main :class="$style.container">
		<div :class="$style.header">
			<N8nHeading bold tag="h2" size="xlarge">Agent OS</N8nHeading>
			<N8nText color="text-light" size="small"> {{ agentsStore.agents.length }} agents </N8nText>
			<N8nButton
				label="+ Add Agent"
				size="small"
				type="secondary"
				data-testid="add-agent-button"
				:class="$style.addBtn"
				@click="showAddDialog = true"
			/>
		</div>

		<!-- Add Agent Dialog -->
		<div v-if="showAddDialog" :class="$style.dialogOverlay" @click.self="onCancelAdd">
			<div :class="$style.dialog" data-testid="add-agent-dialog">
				<N8nHeading bold tag="h3" size="medium">Add Agent</N8nHeading>
				<div :class="$style.dialogField">
					<label :class="$style.dialogLabel">Name</label>
					<input
						v-model="newAgentName"
						:class="$style.dialogInput"
						type="text"
						placeholder="e.g. Docs Curator"
						data-testid="add-agent-name"
						maxlength="32"
						@keydown.enter="onCreateAgent"
					/>
				</div>
				<div :class="$style.dialogField">
					<label :class="$style.dialogLabel">Avatar (emoji or URL, optional)</label>
					<input
						v-model="newAgentAvatar"
						:class="$style.dialogInput"
						type="text"
						data-testid="add-agent-avatar"
						maxlength="255"
						@keydown.enter="onCreateAgent"
					/>
				</div>
				<div :class="$style.dialogActions">
					<N8nButton label="Cancel" type="tertiary" size="small" @click="onCancelAdd" />
					<N8nButton
						label="Create"
						size="small"
						:disabled="!newAgentName.trim() || isCreating"
						:loading="isCreating"
						data-testid="add-agent-submit"
						@click="onCreateAgent"
					/>
				</div>
			</div>
		</div>
		<div :class="$style.body">
			<div ref="canvasRef" :class="$style.canvas" data-testid="agents-canvas">
				<!-- Layer 1: Permission Zones -->
				<PermissionZone v-for="zone in agentsStore.zones" :key="zone.projectId" :zone="zone" />

				<!-- Layer 2: Connection Lines -->
				<ConnectionLines
					:connections="agentsStore.connections"
					:agents="agentsStore.agents"
					@remove-connection="onRemoveConnection"
				/>

				<!-- Layer 3: Agent Cards -->
				<AgentCard
					v-for="agent in agentsStore.agents"
					:key="agent.id"
					:agent="agent"
					:selected="agentsStore.selectedAgentId === agent.id"
					:zone-color="getZoneColor(agent.id)"
					@drag-start="onDragStart"
				/>

				<div
					v-if="agentsStore.agents.length === 0 && agentsStore.zones.length === 0"
					:class="$style.empty"
				>
					No agents found. Click "+ Add Agent" to create one.
				</div>
				<div v-else-if="agentsStore.zones.length === 0" :class="$style.zonesEmpty">
					No team projects found.
				</div>
			</div>

			<AgentActionPanel v-if="panelStore.panelOpen" />
		</div>
	</main>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg) var(--spacing--2xl);
	border-bottom: var(--border);
	background: var(--color--background);
	flex-shrink: 0;
	z-index: 1;
	min-height: var(--spacing--3xl);
}

.body {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.canvas {
	flex: 1;
	position: relative;
	overflow: hidden;
	background-color: var(--color--background--light-2);
	background-image: radial-gradient(circle, var(--color--foreground--tint-1) 1px, transparent 1px);
	background-size: 20px 20px;
}

.empty {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--md);
}

.zonesEmpty {
	position: absolute;
	bottom: var(--spacing--lg);
	left: 50%;
	transform: translateX(-50%);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.addBtn {
	margin-left: auto;
}

.dialogOverlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}

.dialog {
	background: var(--color--background);
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
	width: 360px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.dialogField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.dialogLabel {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.dialogInput {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	background: var(--color--background);

	&:focus {
		outline: none;
		border-color: var(--color--primary);
	}
}

.dialogActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
