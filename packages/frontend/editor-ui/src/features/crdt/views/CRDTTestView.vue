<script lang="ts" setup>
import { ref, shallowRef, watch } from 'vue';
import { N8nButton, N8nCard, N8nText, N8nInputLabel, N8nInput } from '@n8n/design-system';
import {
	useCRDTSync,
	simulateExecutionInWorker,
	clearExecutionsInWorker,
	type UseCRDTSyncReturn,
} from '../composables';
import { isMapChange, type CRDTMap, type ChangeOrigin } from '@n8n/crdt/browser';
import set from 'lodash/set';

// Sample node data structure (matches n8n's node format)
interface TestNode {
	id: string;
	name: string;
	position: [number, number];
	type: string;
}

// Execution data structure (local-only, not synced to server)
interface ExecutionData {
	nodeId: string;
	status: 'pending' | 'running' | 'success' | 'error';
	output?: string;
	timestamp?: number;
}

interface WorkflowPanel {
	id: string;
	docId: string;
	nodes: Record<string, TestNode>;
	executions: Record<string, ExecutionData>;
	changeLog: string[];
	newNodeName: string;
	selectedNodeId: string | null;
	editX: number;
	editY: number;
	unsubscribeDeepChange: (() => void) | null;
	unsubscribeExecutionChange: (() => void) | null;
}

// Track all workflow panels - use shallowRef to avoid deep reactivity issues
const panels = shallowRef<WorkflowPanel[]>([]);
// Store CRDT instances separately to preserve ref reactivity
// Each panel has two CRDT instances: workflow (server-synced) and execution (local-only)
const crdtInstances = new Map<string, UseCRDTSyncReturn>();
const executionCrdtInstances = new Map<string, UseCRDTSyncReturn>();
const newWorkflowId = ref('');

// Force re-render helper
function updatePanels() {
	panels.value = [...panels.value];
}

// Helper to generate a random workflow ID for testing
function generateRandomId(): string {
	return 'test-' + Math.random().toString(36).slice(2, 10);
}

// Get CRDT instance for a panel (workflow doc - server-synced)
function getCrdt(panel: WorkflowPanel): UseCRDTSyncReturn | undefined {
	return crdtInstances.get(panel.id);
}

// Get execution CRDT instance for a panel (local-only)
function getExecutionCrdt(panel: WorkflowPanel): UseCRDTSyncReturn | undefined {
	return executionCrdtInstances.get(panel.id);
}

// Panel-specific helpers (defined before use)
function getNodesMap(panel: WorkflowPanel): CRDTMap<unknown> | null {
	const crdt = getCrdt(panel);
	if (!crdt?.doc) return null;
	return crdt.doc.getMap<unknown>('nodes');
}

function getNodeMap(panel: WorkflowPanel, nodeId: string): CRDTMap<unknown> | undefined {
	const value = getNodesMap(panel)?.get(nodeId);
	return value as CRDTMap<unknown> | undefined;
}

function logChange(panel: WorkflowPanel, message: string) {
	const timestamp = new Date().toLocaleTimeString();
	panel.changeLog.unshift(`[${timestamp}] ${message}`);
	if (panel.changeLog.length > 30) {
		panel.changeLog.pop();
	}
	updatePanels();
}

function setupPanelSync(panel: WorkflowPanel) {
	const crdt = getCrdt(panel);
	if (!crdt?.doc) return;

	const nodesMap = crdt.doc.getMap<TestNode>('nodes');
	panel.nodes = nodesMap.toJSON();

	// Skip logging for the first batch of changes (initial sync)
	let isInitialSync = true;

	panel.unsubscribeDeepChange = nodesMap.onDeepChange((changes, origin: ChangeOrigin) => {
		changes.forEach((change) => {
			if (!isMapChange(change)) return;

			if (change.action === 'add') {
				panel.nodes[(change.value as TestNode).id] = change.value as TestNode;
			} else if (change.action === 'update') {
				const [id, ...path] = change.path;
				set(panel.nodes[id as string], path, change.value);
			} else if (change.action === 'delete') {
				delete panel.nodes[change.path[0] as string];
			}
		});

		if (isInitialSync) {
			isInitialSync = false;
			logChange(panel, `[workflow] initial sync: ${Object.keys(panel.nodes).length} node(s)`);
		} else {
			logChange(panel, `[workflow] ${origin} change: ${changes.length} update(s)`);
		}
	});
	updatePanels();
}

function setupExecutionSync(panel: WorkflowPanel) {
	const crdt = getExecutionCrdt(panel);
	if (!crdt?.doc) return;

	const executionsMap = crdt.doc.getMap<ExecutionData>('executions');
	panel.executions = executionsMap.toJSON();

	// Skip logging for the first batch of changes (initial sync)
	let isInitialSync = true;

	panel.unsubscribeExecutionChange = executionsMap.onDeepChange((changes, origin: ChangeOrigin) => {
		changes.forEach((change) => {
			if (!isMapChange(change)) return;

			if (change.action === 'add') {
				panel.executions[(change.value as ExecutionData).nodeId] = change.value as ExecutionData;
			} else if (change.action === 'update') {
				const [nodeId, ...path] = change.path;
				set(panel.executions[nodeId as string], path, change.value);
			} else if (change.action === 'delete') {
				delete panel.executions[change.path[0] as string];
			}
		});

		if (isInitialSync) {
			isInitialSync = false;
			logChange(panel, `[exec] initial sync: ${Object.keys(panel.executions).length} execution(s)`);
		} else {
			logChange(panel, `[exec] ${origin} change: ${changes.length} update(s)`);
		}
	});
	updatePanels();
}

// Create a new workflow panel
function addWorkflowPanel(docId?: string) {
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should also use fallback
	const id = docId?.trim() || generateRandomId();

	// Check if already open
	if (panels.value.some((p) => p.docId === id)) {
		alert(`Workflow ${id} is already open`);
		return;
	}

	const panelId = `panel-${Date.now()}`;

	// Create workflow CRDT (server-synced)
	// immediate: false so we can set up watcher before connecting
	const crdt = useCRDTSync({ docId: id, immediate: false });
	crdtInstances.set(panelId, crdt);

	// Create execution CRDT (local-only, cross-tab sync only)
	const executionDocId = `${id}:execution`;
	const executionCrdt = useCRDTSync({ docId: executionDocId, immediate: false, serverSync: false });
	executionCrdtInstances.set(panelId, executionCrdt);

	const panel: WorkflowPanel = {
		id: panelId,
		docId: id,
		nodes: {},
		executions: {},
		changeLog: [],
		newNodeName: '',
		selectedNodeId: null,
		editX: 0,
		editY: 0,
		unsubscribeDeepChange: null,
		unsubscribeExecutionChange: null,
	};

	panels.value = [...panels.value, panel];
	newWorkflowId.value = '';

	// Watch for workflow CRDT state changes and set up sync when ready
	const stopWorkflowWatch = watch(
		() => crdt.state.value,
		(state) => {
			if (state === 'ready') {
				stopWorkflowWatch();
				setupPanelSync(panel);
			}
		},
	);

	// Watch for execution CRDT state changes and set up sync when ready
	const stopExecutionWatch = watch(
		() => executionCrdt.state.value,
		(state) => {
			if (state === 'ready') {
				stopExecutionWatch();
				setupExecutionSync(panel);
			}
		},
	);

	// Store cleanup functions
	const originalUnsubscribe = panel.unsubscribeDeepChange;
	panel.unsubscribeDeepChange = () => {
		stopWorkflowWatch();
		originalUnsubscribe?.();
	};

	const originalExecutionUnsubscribe = panel.unsubscribeExecutionChange;
	panel.unsubscribeExecutionChange = () => {
		stopExecutionWatch();
		originalExecutionUnsubscribe?.();
	};

	// Connect both CRDTs
	void crdt.connect();
	void executionCrdt.connect();
}

// Remove a workflow panel
function removeWorkflowPanel(panel: WorkflowPanel) {
	// Clean up workflow CRDT
	panel.unsubscribeDeepChange?.();
	const crdt = getCrdt(panel);
	crdt?.disconnect();
	crdtInstances.delete(panel.id);

	// Clean up execution CRDT
	panel.unsubscribeExecutionChange?.();
	const executionCrdt = getExecutionCrdt(panel);
	executionCrdt?.disconnect();
	executionCrdtInstances.delete(panel.id);

	panels.value = panels.value.filter((p) => p.id !== panel.id);
}

function getConnectionStatus(panel: WorkflowPanel): string {
	const crdt = getCrdt(panel);
	if (!crdt) return 'No CRDT';
	switch (crdt.state.value) {
		case 'idle':
			return 'Idle';
		case 'connecting':
			return 'Connecting...';
		case 'ready':
			return 'Syncing';
		case 'disconnected':
			return 'Disconnected';
		case 'error':
			return `Error: ${crdt.error.value ?? 'Unknown'}`;
		default:
			return 'Unknown';
	}
}

function getStatusColor(panel: WorkflowPanel): string {
	const crdt = getCrdt(panel);
	if (!crdt) return 'var(--color--danger)';
	switch (crdt.state.value) {
		case 'ready':
			return 'var(--color--success)';
		case 'connecting':
			return 'var(--color--warning)';
		case 'idle':
		case 'disconnected':
		case 'error':
		default:
			return 'var(--color--danger)';
	}
}

function isPanelReady(panel: WorkflowPanel): boolean {
	const crdt = getCrdt(panel);
	return crdt?.state.value === 'ready';
}

// Node operations
function addNode(panel: WorkflowPanel) {
	const crdt = getCrdt(panel);
	if (!crdt?.doc || !panel.newNodeName.trim()) return;

	const nodeId = `node-${Date.now()}`;
	const name = panel.newNodeName.trim();
	const x = Math.round(Math.random() * 400);
	const y = Math.round(Math.random() * 300);

	const nodesMap = getNodesMap(panel);
	if (!nodesMap) return;

	const crdtDoc = crdt.doc;
	crdtDoc.transact(() => {
		const nodeMap = crdtDoc.createMap<unknown>();
		nodeMap.set('id', nodeId);
		nodeMap.set('name', name);
		nodeMap.set('type', 'test');
		nodeMap.set('position', [x, y]);
		nodesMap.set(nodeId, nodeMap);
	});

	panel.newNodeName = '';
	logChange(panel, `Added node: ${name}`);
}

function selectNode(panel: WorkflowPanel, nodeId: string) {
	panel.selectedNodeId = nodeId;
	const node = panel.nodes[nodeId];
	if (node) {
		panel.editX = Math.round(node.position[0]);
		panel.editY = Math.round(node.position[1]);
	}
	updatePanels();
}

function updatePosition(panel: WorkflowPanel) {
	const crdt = getCrdt(panel);
	if (!crdt?.doc || !panel.selectedNodeId) return;

	const currentNode = panel.nodes[panel.selectedNodeId];
	if (!currentNode) return;

	const nodeMap = getNodeMap(panel, panel.selectedNodeId);
	if (!nodeMap) return;

	nodeMap.set('position', [panel.editX, panel.editY]);
	logChange(panel, `Updated position of ${currentNode.name} to (${panel.editX}, ${panel.editY})`);
}

function deleteNode(panel: WorkflowPanel, nodeId: string) {
	const crdt = getCrdt(panel);
	if (!crdt?.doc) return;

	const node = panel.nodes[nodeId];
	const nodesMap = getNodesMap(panel);
	if (!nodesMap) return;

	nodesMap.delete(nodeId);

	if (panel.selectedNodeId === nodeId) {
		panel.selectedNodeId = null;
	}

	logChange(panel, `Deleted node: ${node?.name ?? nodeId}`);
}

function reconnect(panel: WorkflowPanel) {
	const crdt = getCrdt(panel);
	const executionCrdt = getExecutionCrdt(panel);
	if (!crdt || !executionCrdt) return;

	// Disconnect both
	crdt.disconnect();
	executionCrdt.disconnect();

	// Reset panel state
	panel.nodes = {};
	panel.executions = {};
	panel.changeLog = [];
	panel.selectedNodeId = null;

	// Watch for workflow CRDT state changes
	const stopWorkflowWatch = watch(
		() => crdt.state.value,
		(state) => {
			if (state === 'ready') {
				stopWorkflowWatch();
				setupPanelSync(panel);
			}
		},
	);

	// Watch for execution CRDT state changes
	const stopExecutionWatch = watch(
		() => executionCrdt.state.value,
		(state) => {
			if (state === 'ready') {
				stopExecutionWatch();
				setupExecutionSync(panel);
			}
		},
	);

	// Reconnect both
	void crdt.connect();
	void executionCrdt.connect();
	updatePanels();
}

// Execution operations - delegated to SharedWorker
function runAllExecutions(panel: WorkflowPanel) {
	const nodeIds = Object.keys(panel.nodes);
	if (nodeIds.length === 0) return;

	// Send to worker - it will update the execution doc
	simulateExecutionInWorker(panel.docId, nodeIds);
}

function clearExecutions(panel: WorkflowPanel) {
	// Send to worker - it will clear the execution doc
	clearExecutionsInWorker(panel.docId);
}

function getExecutionStatusColor(status: ExecutionData['status']): string {
	switch (status) {
		case 'pending':
			return 'var(--color--text--tint-2)';
		case 'running':
			return 'var(--color--warning)';
		case 'success':
			return 'var(--color--success)';
		case 'error':
			return 'var(--color--danger)';
		default:
			return 'var(--color--text--tint-2)';
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nText tag="h1" size="xlarge" bold>CRDT Multi-Workflow Test</N8nText>
			<div :class="$style.addWorkflow">
				<N8nInput
					v-model="newWorkflowId"
					placeholder="Workflow ID (or leave empty for random)"
					:class="$style.workflowIdInput"
					@keyup.enter="addWorkflowPanel(newWorkflowId)"
				/>
				<N8nButton type="primary" @click="addWorkflowPanel(newWorkflowId)">
					Add Workflow Panel
				</N8nButton>
			</div>
		</div>

		<div v-if="panels.length === 0" :class="$style.emptyState">
			<N8nText size="large" color="text-light">
				No workflows open. Add a workflow panel above to start testing.
			</N8nText>
			<N8nText size="small" color="text-light">
				Tip: Use the same workflow ID in multiple browser tabs to test real-time sync.
			</N8nText>
		</div>

		<div v-else :class="$style.panelsContainer">
			<N8nCard v-for="panel in panels" :key="panel.id" :class="$style.workflowPanel">
				<!-- Panel Header -->
				<template #header>
					<div :class="$style.panelHeader">
						<div :class="$style.panelTitle">
							<div :class="$style.titleRow">
								<N8nText tag="h3" size="medium" bold>{{ panel.docId }}</N8nText>
								<div :class="$style.badges">
									<span :class="[$style.badge, $style.badgeServer]">Server</span>
									<span :class="[$style.badge, $style.badgeLocal]">Local</span>
								</div>
							</div>
							<div :class="$style.status">
								<span
									:class="$style.statusDot"
									:style="{ backgroundColor: getStatusColor(panel) }"
								/>
								<N8nText size="small">{{ getConnectionStatus(panel) }}</N8nText>
							</div>
						</div>
						<div :class="$style.panelActions">
							<N8nButton type="tertiary" size="small" @click="reconnect(panel)">
								Reconnect
							</N8nButton>
							<N8nButton type="tertiary" size="small" @click="removeWorkflowPanel(panel)">
								Close
							</N8nButton>
						</div>
					</div>
				</template>

				<div :class="$style.panelContent">
					<!-- Nodes Section -->
					<div :class="$style.section">
						<N8nText tag="h4" size="small" bold>Nodes</N8nText>
						<div :class="$style.addForm">
							<N8nInput
								v-model="panel.newNodeName"
								placeholder="Node name"
								size="small"
								:disabled="!isPanelReady(panel)"
								@keyup.enter="addNode(panel)"
							/>
							<N8nButton
								type="primary"
								size="small"
								:disabled="!isPanelReady(panel) || !panel.newNodeName.trim()"
								@click="addNode(panel)"
							>
								Add
							</N8nButton>
						</div>

						<div :class="$style.nodeList">
							<div
								v-for="node in Object.values(panel.nodes)"
								:key="node.id"
								:class="[$style.nodeItem, { [$style.selected]: panel.selectedNodeId === node.id }]"
								@click="selectNode(panel, node.id)"
							>
								<div :class="$style.nodeInfo">
									<N8nText size="small" bold>{{ node.name }}</N8nText>
									<N8nText size="small" color="text-light">
										({{ Math.round(node.position[0]) }}, {{ Math.round(node.position[1]) }})
									</N8nText>
								</div>
								<N8nButton
									type="tertiary"
									size="mini"
									:disabled="!isPanelReady(panel)"
									@click.stop="deleteNode(panel, node.id)"
								>
									×
								</N8nButton>
							</div>
							<N8nText v-if="Object.keys(panel.nodes).length === 0" size="small" color="text-light">
								No nodes
							</N8nText>
						</div>
					</div>

					<!-- Edit Section -->
					<div
						v-if="panel.selectedNodeId && panel.nodes[panel.selectedNodeId]"
						:class="$style.section"
					>
						<N8nText tag="h4" size="small" bold>
							Edit: {{ panel.nodes[panel.selectedNodeId]?.name }}
						</N8nText>
						<div :class="$style.editForm">
							<div :class="$style.positionInputs">
								<N8nInputLabel label="X" size="small">
									<N8nInput
										v-model.number="panel.editX"
										type="number"
										size="small"
										:disabled="!isPanelReady(panel)"
									/>
								</N8nInputLabel>
								<N8nInputLabel label="Y" size="small">
									<N8nInput
										v-model.number="panel.editY"
										type="number"
										size="small"
										:disabled="!isPanelReady(panel)"
									/>
								</N8nInputLabel>
							</div>
							<N8nButton
								type="primary"
								size="small"
								:disabled="!isPanelReady(panel)"
								@click="updatePosition(panel)"
							>
								Update
							</N8nButton>
						</div>
					</div>

					<!-- Executions Section (Local-only CRDT) -->
					<div :class="$style.section">
						<div :class="$style.sectionHeader">
							<N8nText tag="h4" size="small" bold>Executions</N8nText>
							<span :class="[$style.badge, $style.badgeLocal, $style.badgeSmall]">Local Only</span>
						</div>
						<div :class="$style.executionActions">
							<N8nButton
								type="secondary"
								size="small"
								:disabled="!isPanelReady(panel) || Object.keys(panel.nodes).length === 0"
								@click="runAllExecutions(panel)"
							>
								Run All
							</N8nButton>
							<N8nButton
								type="tertiary"
								size="small"
								:disabled="!isPanelReady(panel) || Object.keys(panel.executions).length === 0"
								@click="clearExecutions(panel)"
							>
								Clear
							</N8nButton>
						</div>
						<div :class="$style.executionList">
							<div
								v-for="exec in Object.values(panel.executions)"
								:key="exec.nodeId"
								:class="$style.executionItem"
							>
								<div :class="$style.executionInfo">
									<span
										:class="$style.executionDot"
										:style="{ backgroundColor: getExecutionStatusColor(exec.status) }"
									/>
									<N8nText size="small">{{
										panel.nodes[exec.nodeId]?.name ?? exec.nodeId
									}}</N8nText>
								</div>
								<N8nText size="small" :style="{ color: getExecutionStatusColor(exec.status) }">
									{{ exec.status }}
								</N8nText>
							</div>
							<N8nText
								v-if="Object.keys(panel.executions).length === 0"
								size="small"
								color="text-light"
							>
								No executions (click "Run All" to simulate)
							</N8nText>
						</div>
					</div>

					<!-- Change Log -->
					<div :class="$style.section">
						<N8nText tag="h4" size="small" bold>Log</N8nText>
						<div :class="$style.changeLog">
							<div
								v-for="(entry, index) in panel.changeLog.slice(0, 10)"
								:key="index"
								:class="$style.logEntry"
							>
								<N8nText size="small">{{ entry }}</N8nText>
							</div>
							<N8nText v-if="panel.changeLog.length === 0" size="small" color="text-light">
								No changes yet
							</N8nText>
						</div>
					</div>
				</div>
			</N8nCard>
		</div>

		<div :class="$style.instructions">
			<N8nText size="small" color="text-light">
				Open multiple workflow panels with the same ID to test sync within a tab. Open this page in
				multiple browser tabs with the same workflow IDs to test cross-tab sync.
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow: auto;
	background-color: var(--color--background--light-2);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--spacing--md);
}

.addWorkflow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.workflowIdInput {
	width: 280px;
}

.emptyState {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
}

.panelsContainer {
	flex: 1;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
	gap: var(--spacing--md);
	align-content: start;
	overflow: auto;
}

.workflowPanel {
	display: flex;
	flex-direction: column;
	max-height: 600px;
}

.panelHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.panelTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.panelActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.panelContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	overflow: auto;
	flex: 1;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.addForm {
	display: flex;
	gap: var(--spacing--xs);
}

.nodeList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-height: 150px;
	overflow: auto;
}

.nodeItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius--sm);
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}

	&.selected {
		background-color: var(--color--primary--tint-3);
	}
}

.nodeInfo {
	display: flex;
	flex-direction: column;
}

.editForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.positionInputs {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--xs);
}

.changeLog {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-height: 100px;
	overflow: auto;
}

.logEntry {
	padding: var(--spacing--3xs) var(--spacing--xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	font-family: monospace;
	font-size: var(--font-size--3xs);
}

.instructions {
	text-align: center;
	padding: var(--spacing--sm);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.badges {
	display: flex;
	gap: var(--spacing--3xs);
}

.badge {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.badgeServer {
	background-color: var(--color--primary--tint-2);
	color: var(--color--primary--shade-1);
}

.badgeLocal {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.badgeSmall {
	padding: 2px var(--spacing--4xs);
	font-size: 9px;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.executionActions {
	display: flex;
	gap: var(--spacing--xs);
}

.executionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-height: 120px;
	overflow: auto;
}

.executionItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
}

.executionInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.executionDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}
</style>
