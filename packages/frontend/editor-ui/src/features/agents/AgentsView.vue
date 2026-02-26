<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import {
	N8nButton,
	N8nCard,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nHeading,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import CopyInput from '@/app/components/CopyInput.vue';
import { isExternalAgent } from './agents.types';
import {
	useAgentsStore,
	ZONE_COLORS,
	UNASSIGNED_ZONE_ID,
	EXTERNAL_ZONE_ID,
	EXTERNAL_ZONE_COLOR,
} from './agents.store';
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
const createdApiKey = ref<string | null>(null);

// External agent registration state
const dialogTab = ref<'create' | 'external'>('create');
const externalUrl = ref('');
const externalApiKey = ref('');
const isDiscovering = ref(false);
const discoverError = ref<string | null>(null);

async function onCreateAgent() {
	const name = newAgentName.value.trim();
	if (!name) return;

	isCreating.value = true;
	try {
		const avatar = newAgentAvatar.value.trim() || undefined;
		const { apiKey } = await agentsStore.createAgent(name, avatar);

		// Re-layout to position the new agent in the unassigned zone
		if (canvasRef.value) {
			agentsStore.layoutAndPosition(canvasRef.value.clientWidth);
		}

		if (apiKey) {
			createdApiKey.value = apiKey;
		} else {
			newAgentName.value = '';
			newAgentAvatar.value = '';
			showAddDialog.value = false;
		}
	} finally {
		isCreating.value = false;
	}
}

async function onRegisterExternal() {
	const url = externalUrl.value.trim();
	const apiKey = externalApiKey.value.trim();
	if (!url || !apiKey) return;

	isDiscovering.value = true;
	discoverError.value = null;
	try {
		await agentsStore.registerExternalAgent(url, apiKey);

		// Re-layout to position in external zone
		if (canvasRef.value) {
			agentsStore.layoutAndPosition(canvasRef.value.clientWidth);
		}

		externalUrl.value = '';
		externalApiKey.value = '';
		showAddDialog.value = false;
	} catch (error) {
		discoverError.value =
			error instanceof Error ? error.message : 'Failed to discover remote agent';
	} finally {
		isDiscovering.value = false;
	}
}

function onDismissApiKey() {
	createdApiKey.value = null;
	newAgentName.value = '';
	newAgentAvatar.value = '';
	showAddDialog.value = false;
}

watch(showAddDialog, (open) => {
	if (!open) {
		createdApiKey.value = null;
		newAgentName.value = '';
		newAgentAvatar.value = '';
		dialogTab.value = 'create';
		externalUrl.value = '';
		externalApiKey.value = '';
		discoverError.value = null;
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
		await agentsStore.fetchZones(canvasRef.value.clientWidth);

		resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				agentsStore.recomputeZoneLayouts(entry.contentRect.width);
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
	const agent = agentsStore.allAgents.find((a) => a.id === agentId);
	if (!agent?.zoneId) return null;
	if (agent.zoneId === EXTERNAL_ZONE_ID) return EXTERNAL_ZONE_COLOR;
	const zone = agentsStore.zones.find((z) => z.projectId === agent.zoneId);
	if (!zone) return null;
	return ZONE_COLORS[zone.colorIndex % ZONE_COLORS.length];
}

function onDragStart(agentId: string, event: PointerEvent) {
	const agent = agentsStore.allAgents.find((a) => a.id === agentId);
	if (!agent || !canvasRef.value) return;

	const canvasRect = canvasRef.value.getBoundingClientRect();
	const scrollTop = canvasRef.value.scrollTop;
	dragState = {
		agentId,
		offsetX: event.clientX - canvasRect.left - agent.position.x,
		offsetY: event.clientY - canvasRect.top + scrollTop - agent.position.y,
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
	const scrollTop = canvasRef.value.scrollTop;
	const x = event.clientX - canvasRect.left - dragState.offsetX;
	const y = event.clientY - canvasRect.top + scrollTop - dragState.offsetY;

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

	const agent = agentsStore.allAgents.find((a) => a.id === agentId);
	if (!agent) return;

	// External agents can't be reassigned to zones
	if (isExternalAgent(agent)) {
		if (canvasRef.value) {
			agentsStore.layoutAndPosition(canvasRef.value.clientWidth);
		}
		return;
	}

	const centerX = agent.position.x + CARD_WIDTH / 2;
	const centerY = agent.position.y + CARD_HEIGHT / 2;
	const targetZoneId = hitTestZone(centerX, centerY);

	if (targetZoneId === UNASSIGNED_ZONE_ID && agent.zoneId) {
		// Dropped into unassigned zone — remove from project
		await agentsStore.removeAgentFromZone(agentId, agent.zoneId);
	} else if (targetZoneId && targetZoneId !== UNASSIGNED_ZONE_ID && targetZoneId !== agent.zoneId) {
		// Dropped into a project zone
		await agentsStore.assignAgentToZone(agentId, targetZoneId);
	} else if (!targetZoneId && agent.zoneId) {
		// Dropped outside all zones — remove from project
		await agentsStore.removeAgentFromZone(agentId, agent.zoneId);
	}

	// Re-layout after any zone change
	if (canvasRef.value) {
		agentsStore.layoutAndPosition(canvasRef.value.clientWidth);
	}
}

function onRemoveConnection(lineId: string) {
	agentsStore.removeConnection(lineId);
}
</script>

<template>
	<main :class="$style.container">
		<div :class="$style.header">
			<N8nHeading bold tag="h2" size="xlarge">Agents</N8nHeading>
			<N8nText color="text-light" size="small"> {{ agentsStore.allAgents.length }} agents </N8nText>
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
			:header="createdApiKey ? 'Agent Created' : 'Add Agent'"
			data-testid="add-agent-dialog"
			@update:open="showAddDialog = $event"
		>
			<!-- API Key display after creation -->
			<template v-if="createdApiKey">
				<N8nCard :class="$style.apiKeyCard">
					<CopyInput
						label="A2A API Key"
						:value="createdApiKey"
						:redact-value="true"
						copy-button-text="Click to copy"
						toast-title="API Key copied"
						hint="Copy this key now. It will not be shown again."
						data-testid="agent-api-key"
					/>
				</N8nCard>
				<N8nDialogFooter>
					<N8nButton
						label="Done"
						size="small"
						data-testid="agent-api-key-done"
						@click="onDismissApiKey"
					/>
				</N8nDialogFooter>
			</template>

			<!-- Tab toggle: Create Local / Register External -->
			<template v-else>
				<div :class="$style.tabRow">
					<button
						:class="[$style.tab, { [$style.tabActive]: dialogTab === 'create' }]"
						data-testid="add-agent-tab-create"
						@click="dialogTab = 'create'"
					>
						Create Local
					</button>
					<button
						:class="[$style.tab, { [$style.tabActive]: dialogTab === 'external' }]"
						data-testid="add-agent-tab-external"
						@click="dialogTab = 'external'"
					>
						Register External
					</button>
				</div>

				<!-- Local creation form -->
				<template v-if="dialogTab === 'create'">
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
				</template>

				<!-- External registration form -->
				<template v-else>
					<div :class="$style.dialogField">
						<N8nText tag="label" size="small" bold>Instance URL</N8nText>
						<N8nInput
							v-model="externalUrl"
							placeholder="e.g. https://other.n8n.cloud"
							:maxlength="2048"
							data-testid="external-agent-url"
							@keydown.enter="onRegisterExternal"
						/>
					</div>
					<div :class="$style.dialogField">
						<N8nText tag="label" size="small" bold>API Key</N8nText>
						<N8nInput
							v-model="externalApiKey"
							placeholder="Remote agent API key"
							type="password"
							:maxlength="512"
							data-testid="external-agent-apikey"
							@keydown.enter="onRegisterExternal"
						/>
					</div>
					<N8nText v-if="discoverError" color="danger" size="small" :class="$style.errorText">
						{{ discoverError }}
					</N8nText>
					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton label="Cancel" type="tertiary" size="small" />
						</N8nDialogClose>
						<N8nButton
							label="Discover & Register"
							size="small"
							:disabled="!externalUrl.trim() || !externalApiKey.trim() || isDiscovering"
							:loading="isDiscovering"
							data-testid="external-agent-submit"
							@click="onRegisterExternal"
						/>
					</N8nDialogFooter>
				</template>
			</template>
		</N8nDialog>
		<div :class="$style.body">
			<div ref="canvasRef" :class="$style.canvas" data-testid="agents-canvas">
				<!-- Layer 1: Permission Zones -->
				<PermissionZone v-for="zone in agentsStore.zones" :key="zone.projectId" :zone="zone" />

				<!-- Layer 2: Connection Lines -->
				<ConnectionLines
					:connections="agentsStore.connections"
					:agents="agentsStore.allAgents"
					:active-connection-ids="panelStore.activeConnections"
					@remove-connection="onRemoveConnection"
				/>

				<!-- Layer 3: Agent Cards (local + external) -->
				<AgentCard
					v-for="agent in agentsStore.allAgents"
					:key="agent.id"
					:agent="agent"
					:selected="agentsStore.selectedAgentId === agent.id"
					:zone-color="getZoneColor(agent.id)"
					@drag-start="onDragStart"
				/>

				<div v-if="agentsStore.allAgents.length === 0" :class="$style.empty">
					No agents found. Click "+ Add Agent" to create one.
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
	flex-shrink: 0;
	z-index: 1;
}

.body {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.canvas {
	flex: 1;
	position: relative;
	overflow-y: auto;
	overflow-x: hidden;
	background-image: radial-gradient(circle, var(--color--foreground--tint-1) 1px, transparent 1px);
	background-size: 24px 24px;
}

.empty {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--md);
}

.addBtn {
	margin-left: auto;
}

.dialogField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.apiKeyCard {
	margin-bottom: var(--spacing--xs);
}

.tabRow {
	display: flex;
	gap: 0;
	margin-bottom: var(--spacing--sm);
	border-bottom: 1px solid var(--color--foreground--tint-2);
}

.tab {
	flex: 1;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition:
		color 0.15s ease,
		border-color 0.15s ease;

	&:hover {
		color: var(--color--text);
	}
}

.tabActive {
	color: var(--color--primary);
	border-bottom-color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}

.errorText {
	margin-top: var(--spacing--4xs);
}
</style>
