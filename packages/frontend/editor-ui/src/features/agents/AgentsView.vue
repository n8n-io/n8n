<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nHeading,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
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

watch(showAddDialog, (open) => {
	if (!open) {
		newAgentName.value = '';
		newAgentAvatar.value = '';
	}
});

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
	agentsStore.initializePushListener();

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
	agentsStore.teardownPushListener();
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
		<N8nDialog
			:open="showAddDialog"
			size="small"
			header="Add Agent"
			data-testid="add-agent-dialog"
			@update:open="showAddDialog = $event"
		>
			<div :class="$style.dialogField">
				<N8nText tag="label" size="small" bold>Name</N8nText>
				<N8nInput
					v-model="newAgentName"
					placeholder="e.g. Docs Curator"
					:maxlength="32"
					data-testid="add-agent-name"
					@keydown.enter="onCreateAgent"
				/>
			</div>
			<div :class="$style.dialogField">
				<N8nText tag="label" size="small" bold>Avatar (emoji or URL, optional)</N8nText>
				<N8nInput
					v-model="newAgentAvatar"
					placeholder="🤖 or https://..."
					:maxlength="255"
					data-testid="add-agent-avatar"
					@keydown.enter="onCreateAgent"
				/>
			</div>
			<N8nDialogFooter>
				<N8nDialogClose as-child>
					<N8nButton label="Cancel" type="tertiary" size="small" />
				</N8nDialogClose>
				<N8nButton
					label="Create"
					size="small"
					:disabled="!newAgentName.trim() || isCreating"
					:loading="isCreating"
					data-testid="add-agent-submit"
					@click="onCreateAgent"
				/>
			</N8nDialogFooter>
		</N8nDialog>
		<div :class="$style.body">
			<div ref="canvasRef" :class="$style.canvas" data-testid="agents-canvas">
				<!-- Layer 1: Permission Zones -->
				<PermissionZone v-for="zone in agentsStore.zones" :key="zone.projectId" :zone="zone" />

				<!-- Layer 2: Connection Lines -->
				<ConnectionLines
					:connections="agentsStore.connections"
					:agents="agentsStore.agents"
					:active-connection-ids="panelStore.activeConnections"
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

.dialogField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
