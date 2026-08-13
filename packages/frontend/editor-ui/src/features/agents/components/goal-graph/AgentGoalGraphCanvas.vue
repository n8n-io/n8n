<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentGoalConfig, AgentSlotConfig, GoalStatus } from '@n8n/api-types';

import NodeIcon from '@/app/components/NodeIcon.vue';
import type { GoalGraphLiveState, ToolExecState } from '../../composables/useAgentChatStream';
import type { GoalGraphToolIcon } from '../../composables/useGoalGraphToolIcons';
import { wouldCreateCycle } from './goalGraphEdit';
import {
	computeGoalGraphLayout,
	GOAL_SIZE,
	TOOL_SIZE,
	TOOL_OFFSET_Y,
	TOOL_GAP_X,
	type Point,
} from './goalGraphLayout';

const props = withDefaults(
	defineProps<{
		goals: AgentGoalConfig[];
		slots: AgentSlotConfig[];
		state: GoalGraphLiveState;
		editable?: boolean;
		/** Runtime tool name → icon, so tool nodes match the config-page chips. */
		toolIcons?: Record<string, GoalGraphToolIcon>;
	}>(),
	{ editable: false, toolIcons: () => ({}) },
);

const emit = defineEmits<{
	'edit-goal': [goalId: string];
	'add-goal': [];
	connect: [payload: { from: string; to: string }];
	'remove-edge': [payload: { from: string; to: string }];
}>();

const i18n = useI18n();

const layout = computed(() => computeGoalGraphLayout(props.goals));

function statusOf(goalId: string): GoalStatus | 'idle' {
	return props.state.statuses[goalId] ?? 'idle';
}

const runStarted = computed(() => Object.keys(props.state.statuses).length > 0);

interface NodeView {
	id: string;
	name: string;
	status: GoalStatus | 'idle';
	x: number;
	y: number;
}

const goalNodes = computed<NodeView[]>(() =>
	props.goals
		.map((goal) => {
			const pos = layout.value.goals[goal.id];
			return pos ? { id: goal.id, name: goal.name, status: statusOf(goal.id), ...pos } : null;
		})
		.filter((n): n is NodeView => n !== null),
);

interface ToolView {
	id: string;
	name: string;
	x: number;
	y: number;
	execState?: ToolExecState;
	available: boolean;
	icon?: GoalGraphToolIcon;
}

const toolNodes = computed<ToolView[]>(() => {
	const out: ToolView[] = [];
	for (const goal of props.goals) {
		const gpos = layout.value.goals[goal.id];
		const tools = goal.tools ?? [];
		if (!gpos || tools.length === 0) continue;
		tools.forEach((att, i) => {
			out.push({
				id: `${goal.id}::${att.tool}::${i}`,
				name: att.tool,
				x: gpos.x + (i - (tools.length - 1) / 2) * TOOL_GAP_X,
				y: gpos.y + TOOL_OFFSET_Y,
				execState: props.state.tools[att.tool],
				available: statusOf(goal.id) === 'active',
				icon: props.toolIcons[att.tool],
			});
		});
	}
	return out;
});

// Runtime tool names are snake_case with no natural break points, so adjacent
// labels would overflow into each other. A zero-width space after each
// separator lets long names wrap cleanly within the label's column.
function breakableToolName(name: string): string {
	return name.replace(/([_-])/g, '$1\u200b');
}

function edgePath(from: Point, to: Point): string {
	const fx = from.x + GOAL_SIZE / 2;
	const tx = to.x - GOAL_SIZE / 2;
	const mid = (fx + tx) / 2;
	return `M ${fx},${from.y} C ${mid},${from.y} ${mid},${to.y} ${tx},${to.y}`;
}

interface EdgeView {
	id: string;
	d: string;
	satisfied: boolean;
}

// Trigger → root edges are derived from the graph shape and never editable.
const triggerEdges = computed<EdgeView[]>(() => {
	const out: EdgeView[] = [];
	for (const rootId of layout.value.roots) {
		const to = layout.value.goals[rootId];
		if (to) {
			out.push({
				id: `trigger::${rootId}`,
				d: edgePath(layout.value.trigger, to),
				satisfied: runStarted.value,
			});
		}
	}
	return out;
});

interface GoalEdgeView extends EdgeView {
	from: string;
	to: string;
	mid: Point;
}

// Exact midpoint (t = 0.5) of the cubic produced by edgePath.
function edgeMidpoint(from: Point, to: Point): Point {
	const fx = from.x + GOAL_SIZE / 2;
	const tx = to.x - GOAL_SIZE / 2;
	const mid = (fx + tx) / 2;
	return { x: (fx + 6 * mid + tx) / 8, y: (from.y + to.y) / 2 };
}

const goalEdges = computed<GoalEdgeView[]>(() => {
	const out: GoalEdgeView[] = [];
	for (const goal of props.goals) {
		const to = layout.value.goals[goal.id];
		if (!to) continue;
		for (const req of goal.requires ?? []) {
			const from = layout.value.goals[req];
			if (!from) continue;
			out.push({
				id: `${req}::${goal.id}`,
				d: edgePath(from, to),
				satisfied: statusOf(req) === 'achieved',
				from: req,
				to: goal.id,
				mid: edgeMidpoint(from, to),
			});
		}
	}
	return out;
});

const hoveredEdgeId = ref<string | null>(null);

function onRemoveEdge(edge: GoalEdgeView) {
	hoveredEdgeId.value = null;
	emit('remove-edge', { from: edge.from, to: edge.to });
}

// --- drag-to-connect ---

const graphEl = ref<HTMLDivElement>();

interface ConnectDrag {
	fromId: string;
	x: number;
	y: number;
	targetId: string | null;
	valid: boolean;
}

const drag = ref<ConnectDrag | null>(null);
// A click fires on the goal node right after a connect-drag's pointerup lands
// on it; suppress that one so it doesn't open the property editor.
let justDragged = false;

function graphPoint(event: PointerEvent): Point {
	const rect = graphEl.value?.getBoundingClientRect();
	return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: 0, y: 0 };
}

function startConnect(fromId: string, event: PointerEvent) {
	if (!props.editable) return;
	const { x, y } = graphPoint(event);
	drag.value = { fromId, x, y, targetId: null, valid: false };
	window.addEventListener('pointermove', onConnectMove);
	window.addEventListener('pointerup', onConnectEnd);
	window.addEventListener('keydown', onConnectKeydown);
}

function onConnectMove(event: PointerEvent) {
	if (!drag.value) return;
	const { x, y } = graphPoint(event);
	const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-goal-id]');
	const targetId = target?.getAttribute('data-goal-id') ?? null;
	const valid =
		targetId !== null &&
		targetId !== drag.value.fromId &&
		!(props.goals.find((g) => g.id === targetId)?.requires ?? []).includes(drag.value.fromId) &&
		!wouldCreateCycle(props.goals, drag.value.fromId, targetId);
	drag.value = { ...drag.value, x, y, targetId, valid };
}

function onConnectEnd() {
	if (drag.value?.targetId && drag.value.valid) {
		emit('connect', { from: drag.value.fromId, to: drag.value.targetId });
	}
	cancelConnect();
}

function onConnectKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') cancelConnect();
}

function cancelConnect() {
	drag.value = null;
	justDragged = true;
	setTimeout(() => {
		justDragged = false;
	}, 0);
	window.removeEventListener('pointermove', onConnectMove);
	window.removeEventListener('pointerup', onConnectEnd);
	window.removeEventListener('keydown', onConnectKeydown);
}

onBeforeUnmount(cancelConnect);

const dragPathD = computed(() => {
	if (!drag.value) return null;
	const from = layout.value.goals[drag.value.fromId];
	if (!from) return null;
	const fx = from.x + GOAL_SIZE / 2;
	const mid = (fx + drag.value.x) / 2;
	return `M ${fx},${from.y} C ${mid},${from.y} ${mid},${drag.value.y} ${drag.value.x},${drag.value.y}`;
});

function onGoalClick(goalId: string) {
	if (!props.editable || justDragged) return;
	emit('edit-goal', goalId);
}

// Dashed goal → tool links (the AI sub-node pattern) + diamond ports.
const toolLinks = computed(() => {
	const out: Array<{ id: string; d: string }> = [];
	for (const goal of props.goals) {
		const gpos = layout.value.goals[goal.id];
		const tools = goal.tools ?? [];
		if (!gpos || tools.length === 0) continue;
		const gy = gpos.y + GOAL_SIZE / 2;
		tools.forEach((_att, i) => {
			const tx = gpos.x + (i - (tools.length - 1) / 2) * TOOL_GAP_X;
			const ty = gpos.y + TOOL_OFFSET_Y - TOOL_SIZE / 2;
			const midY = (gy + ty) / 2;
			out.push({
				id: `${goal.id}::link::${i}`,
				d: `M ${gpos.x},${gy} C ${gpos.x},${midY} ${tx},${midY} ${tx},${ty}`,
			});
		});
	}
	return out;
});

const diamonds = computed<Point[]>(() =>
	props.goals
		.filter((g) => (g.tools ?? []).length > 0)
		.map((g) => layout.value.goals[g.id])
		.filter((p): p is Point => p !== undefined)
		.map((p) => ({ x: p.x, y: p.y + GOAL_SIZE / 2 })),
);

const panelCollapsed = ref(false);

function slotValueLabel(slot: AgentSlotConfig): { text: string; filled: boolean } {
	const value = props.state.slots[slot.name];
	if (value === undefined || value === null || value === '') {
		return { text: '—', filled: false };
	}
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	return { text, filled: true };
}

function statusLabel(status: GoalStatus | 'idle'): string {
	if (status === 'idle') return '';
	return i18n.baseText(`agents.goalGraph.status.${status}` as never);
}
</script>

<template>
	<div :class="[$style.root, drag && $style.dragging]" data-testid="agent-goal-graph-canvas">
		<N8nButton
			v-if="editable"
			variant="subtle"
			size="small"
			:class="$style.addGoalBtn"
			data-testid="goal-graph-add-goal"
			@click="emit('add-goal')"
		>
			<template #icon><N8nIcon icon="plus" :size="16" /></template>
			{{ i18n.baseText('agents.goalGraph.addGoal') }}
		</N8nButton>
		<div :class="$style.scroll">
			<div
				ref="graphEl"
				:class="$style.graph"
				:style="{ width: `${layout.width}px`, height: `${layout.height}px` }"
			>
				<svg :class="$style.edges" :width="layout.width" :height="layout.height">
					<defs>
						<marker
							id="ggArrowOn"
							viewBox="0 0 12 12"
							refX="10"
							refY="6"
							markerWidth="10"
							markerHeight="10"
							orient="auto"
						>
							<path d="M0,1 L11,6 L0,11 z" fill="var(--color--success)" />
						</marker>
						<marker
							id="ggArrowOff"
							viewBox="0 0 12 12"
							refX="10"
							refY="6"
							markerWidth="10"
							markerHeight="10"
							orient="auto"
						>
							<path d="M0,1 L11,6 L0,11 z" fill="var(--color--foreground--shade-1)" />
						</marker>
					</defs>
					<path
						v-for="edge in triggerEdges"
						:key="edge.id"
						:d="edge.d"
						fill="none"
						stroke-width="2"
						:stroke="edge.satisfied ? 'var(--color--success)' : 'var(--color--foreground--shade-1)'"
						:marker-end="edge.satisfied ? 'url(#ggArrowOn)' : 'url(#ggArrowOff)'"
					/>
					<g
						v-for="edge in goalEdges"
						:key="edge.id"
						:class="hoveredEdgeId === edge.id && $style.edgeHovered"
					>
						<path
							:d="edge.d"
							fill="none"
							stroke-width="2"
							:class="$style.edgeVisible"
							:stroke="
								edge.satisfied ? 'var(--color--success)' : 'var(--color--foreground--shade-1)'
							"
							:marker-end="edge.satisfied ? 'url(#ggArrowOn)' : 'url(#ggArrowOff)'"
						/>
						<template v-if="editable">
							<path
								:d="edge.d"
								fill="none"
								stroke="transparent"
								stroke-width="16"
								:class="$style.edgeHit"
								data-testid="goal-graph-edge-hit"
								@mouseenter="hoveredEdgeId = edge.id"
								@mouseleave="hoveredEdgeId = null"
								@click="onRemoveEdge(edge)"
							/>
							<g
								v-if="hoveredEdgeId === edge.id"
								:class="$style.edgeDelete"
								:transform="`translate(${edge.mid.x}, ${edge.mid.y})`"
							>
								<circle r="9" />
								<path d="M-3.5,-3.5 L3.5,3.5 M3.5,-3.5 L-3.5,3.5" />
							</g>
						</template>
					</g>
					<path
						v-for="link in toolLinks"
						:key="link.id"
						:d="link.d"
						fill="none"
						stroke="var(--color--foreground--shade-1)"
						stroke-width="1.5"
						stroke-dasharray="5,6"
					/>
					<rect
						v-for="(d, i) in diamonds"
						:key="`diamond-${i}`"
						:x="d.x - 5"
						:y="d.y - 5"
						width="10"
						height="10"
						rx="2"
						:transform="`rotate(45 ${d.x} ${d.y})`"
						fill="var(--node--color--background)"
						stroke="var(--color--foreground--shade-1)"
						stroke-width="1.5"
					/>
					<path
						v-if="dragPathD"
						:d="dragPathD"
						fill="none"
						stroke="var(--color--primary)"
						stroke-width="2"
						stroke-dasharray="6,6"
					/>
				</svg>

				<!-- Trigger -->
				<div
					:class="[$style.node, $style.trigger]"
					:style="{
						left: `${layout.trigger.x - GOAL_SIZE / 2}px`,
						top: `${layout.trigger.y - GOAL_SIZE / 2}px`,
					}"
				>
					<svg
						viewBox="0 0 24 24"
						:class="$style.icon"
						fill="none"
						stroke="var(--color--text--tint-1)"
						stroke-width="2"
					>
						<path
							d="M5 5h11a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4H9l-4 3v-3a0 0 0 0 1 0 0V5z"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<div
					:class="$style.label"
					:style="{
						left: `${layout.trigger.x - 90}px`,
						top: `${layout.trigger.y + GOAL_SIZE / 2 + 6}px`,
					}"
				>
					<span :class="$style.name">{{ i18n.baseText('agents.goalGraph.trigger') }}</span>
				</div>

				<!-- Goals -->
				<template v-for="node in goalNodes" :key="node.id">
					<div
						:class="[
							$style.node,
							$style.goal,
							$style[node.status],
							editable && $style.interactive,
							drag?.targetId === node.id && (drag.valid ? $style.dropTarget : $style.dropInvalid),
						]"
						:data-goal-id="node.id"
						data-testid="goal-graph-goal-node"
						:style="{ left: `${node.x - GOAL_SIZE / 2}px`, top: `${node.y - GOAL_SIZE / 2}px` }"
						@click="onGoalClick(node.id)"
					>
						<svg
							viewBox="0 0 40 40"
							:class="$style.icon"
							fill="none"
							stroke="currentColor"
							stroke-width="2.4"
						>
							<circle cx="20" cy="20" r="16" />
							<circle cx="20" cy="20" r="9" />
							<circle cx="20" cy="20" r="2.4" fill="currentColor" />
						</svg>
						<span v-if="node.status === 'achieved'" :class="[$style.badge, $style.badgeAchieved]"
							>✓</span
						>
						<span v-else-if="node.status === 'failed'" :class="[$style.badge, $style.badgeFailed]"
							>✕</span
						>
						<span v-else-if="node.status === 'locked'" :class="[$style.badge, $style.badgeLocked]"
							>🔒</span
						>
						<span
							v-if="editable"
							:class="$style.port"
							data-testid="goal-graph-port"
							@pointerdown.stop.prevent="startConnect(node.id, $event)"
							@click.stop
						/>
					</div>
					<div
						:class="$style.label"
						:style="{ left: `${node.x - 90}px`, top: `${node.y + GOAL_SIZE / 2 + 6}px` }"
					>
						<span :class="$style.name">{{ node.name }}</span>
						<span
							v-if="statusLabel(node.status)"
							:class="[$style.status, $style[`status_${node.status}`]]"
						>
							{{ statusLabel(node.status) }}
						</span>
					</div>
				</template>

				<!-- Tools -->
				<template v-for="tool in toolNodes" :key="tool.id">
					<div
						:title="tool.name"
						:class="[
							$style.tool,
							tool.execState === 'running' && $style.running,
							tool.execState === 'done' && $style.done,
							tool.execState === 'error' && $style.errored,
							runStarted && !tool.available && !tool.execState && $style.toolDim,
						]"
						:style="{ left: `${tool.x - TOOL_SIZE / 2}px`, top: `${tool.y - TOOL_SIZE / 2}px` }"
					>
						<NodeIcon v-if="tool.icon?.nodeType" :node-type="tool.icon.nodeType" :size="26" />
						<N8nIcon v-else :icon="tool.icon?.fallbackIcon ?? 'wrench'" :size="24" />
						<span v-if="tool.execState === 'done'" :class="[$style.badge, $style.badgeAchieved]"
							>✓</span
						>
						<span v-else-if="tool.execState === 'error'" :class="[$style.badge, $style.badgeFailed]"
							>✕</span
						>
					</div>
					<div
						:class="$style.toolLabel"
						:style="{
							left: `${tool.x - (TOOL_GAP_X - 6) / 2}px`,
							top: `${tool.y + TOOL_SIZE / 2 + 4}px`,
							width: `${TOOL_GAP_X - 6}px`,
						}"
					>
						{{ breakableToolName(tool.name) }}
					</div>
				</template>
			</div>
		</div>

		<!-- Run state -->
		<aside :class="[$style.statePanel, panelCollapsed && $style.statePanelCollapsed]">
			<button
				type="button"
				:class="$style.stateHeader"
				:aria-expanded="!panelCollapsed"
				data-testid="goal-graph-state-toggle"
				@click="panelCollapsed = !panelCollapsed"
			>
				<N8nIcon :icon="panelCollapsed ? 'chevron-down' : 'chevron-up'" size="small" />
				<span>{{ i18n.baseText('agents.goalGraph.runState') }}</span>
			</button>
			<div v-show="!panelCollapsed" :class="$style.slotList">
				<div v-for="slot in props.slots" :key="slot.name" :class="$style.slotRow">
					<div :class="$style.slotTop">
						<span :class="$style.slotName" :title="slot.name">{{
							slot.displayName || slot.name
						}}</span>
						<span
							v-if="slot.access !== 'standard'"
							:class="[
								$style.slotBadge,
								slot.access === 'private' ? $style.badgePrivate : $style.badgeProtected,
							]"
						>
							{{
								slot.access === 'private'
									? i18n.baseText('agents.goalGraph.slotAccess.private')
									: i18n.baseText('agents.goalGraph.slotAccess.protected')
							}}
						</span>
					</div>
					<span
						:class="[$style.slotValue, !slotValueLabel(slot).filled && $style.slotEmpty]"
						:title="slotValueLabel(slot).text"
					>
						{{ slotValueLabel(slot).text }}
					</span>
				</div>
			</div>
		</aside>
	</div>
</template>

<style lang="scss" module>
.root {
	position: relative;
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
	background-color: var(--canvas--color--background);
	background-image: radial-gradient(var(--canvas--dot--color) 1px, transparent 1px);
	background-size: 16px 16px;
	overflow: hidden;
}

.scroll {
	flex: 1;
	min-width: 0;
	overflow: auto;
	scrollbar-width: thin;
}

.graph {
	position: relative;
}

.edges {
	position: absolute;
	inset: 0;
	pointer-events: none;
	overflow: visible;
}

.node {
	position: absolute;
	width: 96px;
	height: 96px;
	border-radius: var(--radius--lg);
	background: var(--node--color--background, #fff);
	border: 1.5px solid var(--color--foreground--shade-1);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.trigger {
	border-radius: 36px var(--radius--lg) var(--radius--lg) 36px;
}

.icon {
	width: 36px;
	height: 36px;
}

// Goal status treatments — reuse n8n's node-state border vocabulary.
.goal {
	color: var(--color--text--tint-1);
}

.idle {
	color: var(--color--text--tint-1);
}

.active {
	border-color: var(--color--primary);
	border-width: 2px;
	color: var(--color--primary);
	animation: ggPulse 1.4s ease-in-out infinite;
}

.achieved {
	border-color: var(--color--success);
	border-width: 2px;
	color: var(--color--success);
}

.failed {
	border-color: var(--color--danger);
	border-width: 2px;
	color: var(--color--danger);
}

.locked {
	border-style: dashed;
	border-color: var(--color--foreground--shade-2);
	color: var(--color--foreground--shade-2);
	opacity: 0.6;
}

@keyframes ggPulse {
	0%,
	100% {
		box-shadow: 0 0 0 0 rgba(255, 109, 90, 0);
	}
	50% {
		box-shadow: 0 0 0 7px rgba(255, 109, 90, 0.18);
	}
}

.badge {
	position: absolute;
	right: -7px;
	bottom: -7px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 11px;
	color: #fff;
	border: 2px solid var(--canvas--color--background);
}

.badgeAchieved {
	background: var(--color--success);
}

.badgeFailed {
	background: var(--color--danger);
}

.badgeLocked {
	background: var(--color--foreground--shade-2);
	font-size: 9px;
}

.label {
	position: absolute;
	width: 180px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	pointer-events: none;
	text-align: center;
}

.name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	line-height: var(--line-height--sm);
}

.status {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.status_active {
	color: var(--color--primary);
}
.status_achieved {
	color: var(--color--success);
}
.status_failed {
	color: var(--color--danger);
}
.status_locked {
	color: var(--color--text--tint-1);
}

.tool {
	position: absolute;
	width: 60px;
	height: 60px;
	border-radius: 50%;
	background: var(--node--color--background, #fff);
	border: 1.5px solid var(--color--foreground--shade-1);
	color: var(--color--text--tint-1);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	transition:
		border-color 0.2s,
		color 0.2s;
}

.tool.running {
	border-color: var(--color--primary);
	border-width: 2px;
	color: var(--color--primary);
	animation: ggPulse 1.4s ease-in-out infinite;
}

.tool.done {
	border-color: var(--color--success);
	border-width: 2px;
	color: var(--color--success);
}

.tool.errored {
	border-color: var(--color--danger);
	border-width: 2px;
	color: var(--color--danger);
}

.toolDim {
	opacity: 0.5;
}

/* Width comes inline from TOOL_GAP_X so adjacent labels never collide;
   names wrap at the zero-width breaks inserted after _ and -. */
.toolLabel {
	position: absolute;
	text-align: center;
	font-size: var(--font-size--2xs);
	line-height: 1.3;
	color: var(--color--text--tint-1);
	overflow-wrap: anywhere;
	pointer-events: none;
}

.statePanel {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	width: 244px;
	max-height: calc(100% - 2 * var(--spacing--sm));
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-3, #fff);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
	overflow: hidden;
}

.statePanelCollapsed {
	width: auto;
}

.stateHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.6px;
	color: var(--color--text);
	background: transparent;
	border: none;
	cursor: pointer;
	text-align: left;

	&:hover {
		background: var(--color--background--light-2, rgba(0, 0, 0, 0.03));
	}
}

.slotList {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--3xs) var(--spacing--sm) var(--spacing--sm);
	overflow: auto;
	scrollbar-width: thin;
	border-top: var(--border);
}

.slotRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) 0;

	& + & {
		border-top: 1px solid var(--color--foreground--tint-1);
	}
}

.slotTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--3xs);
}

.slotName {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.slotBadge {
	font-size: 8px;
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.3px;
	text-transform: uppercase;
	padding: 1px 5px;
	border-radius: var(--radius--sm);
	flex-shrink: 0;
}

.badgeProtected {
	color: var(--color--warning);
	background: var(--color--warning--tint-3, rgba(217, 119, 6, 0.14));
}

.badgePrivate {
	color: var(--color--danger);
	background: var(--color--danger--tint-3, rgba(220, 38, 38, 0.14));
}

.slotValue {
	display: block;
	font-family: var(--font-family--monospace, monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	background: var(--color--foreground--tint-2, rgba(0, 0, 0, 0.04));
	padding: 2px var(--spacing--3xs);
	border-radius: var(--radius--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.slotEmpty {
	color: var(--color--text--tint-2);
	background: transparent;
	padding-left: 0;
}

/* --- editing affordances (rendered only when `editable`) --- */

.addGoalBtn {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 1;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.interactive {
	cursor: pointer;

	&:hover {
		border-color: var(--color--primary);
	}
}

.port {
	position: absolute;
	right: -8px;
	top: 50%;
	transform: translateY(-50%);
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--node--color--background, #fff);
	border: 2px solid var(--color--foreground--shade-1);
	cursor: crosshair;

	&:hover {
		border-color: var(--color--primary);
		background: var(--color--primary);
	}
}

/* Defined after the status classes so they win the border-color tie. */
.dropTarget {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 4px rgba(255, 109, 90, 0.25);
}

.dropInvalid {
	border-color: var(--color--danger);
	cursor: not-allowed;
}

.dragging {
	user-select: none;
	cursor: crosshair;

	/* Keep edge hit-areas from shadowing elementFromPoint near nodes. */
	.edgeHit {
		pointer-events: none;
	}
}

.edgeVisible {
	transition: stroke 0.15s;
}

/* The SVG root has pointer-events: none; hit paths opt back in. */
.edgeHit {
	pointer-events: stroke;
	cursor: pointer;
}

.edgeHovered .edgeVisible {
	stroke: var(--color--danger);
}

.edgeDelete {
	pointer-events: none;

	circle {
		fill: var(--color--danger);
	}

	path {
		stroke: #fff;
		stroke-width: 2;
		stroke-linecap: round;
	}
}
</style>
