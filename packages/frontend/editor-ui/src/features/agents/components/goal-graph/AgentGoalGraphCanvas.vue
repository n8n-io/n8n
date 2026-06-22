<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentGoalConfig, AgentSlotConfig, GoalStatus } from '@n8n/api-types';

import type { GoalGraphLiveState, ToolExecState } from '../../composables/useAgentChatStream';
import {
	computeGoalGraphLayout,
	GOAL_SIZE,
	TOOL_SIZE,
	TOOL_OFFSET_Y,
	TOOL_GAP_X,
	type Point,
} from './goalGraphLayout';

const props = defineProps<{
	goals: AgentGoalConfig[];
	slots: AgentSlotConfig[];
	state: GoalGraphLiveState;
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
			});
		});
	}
	return out;
});

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

const mainEdges = computed<EdgeView[]>(() => {
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
			});
		}
	}
	return out;
});

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
	<div :class="$style.root" data-testid="agent-goal-graph-canvas">
		<div :class="$style.scroll">
			<div
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
						v-for="edge in mainEdges"
						:key="edge.id"
						:d="edge.d"
						fill="none"
						stroke-width="2"
						:stroke="edge.satisfied ? 'var(--color--success)' : 'var(--color--foreground--shade-1)'"
						:marker-end="edge.satisfied ? 'url(#ggArrowOn)' : 'url(#ggArrowOff)'"
					/>
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
						:class="[$style.node, $style.goal, $style[node.status]]"
						:style="{ left: `${node.x - GOAL_SIZE / 2}px`, top: `${node.y - GOAL_SIZE / 2}px` }"
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
						:class="[
							$style.tool,
							tool.execState === 'running' && $style.running,
							tool.execState === 'done' && $style.done,
							tool.execState === 'error' && $style.errored,
							!tool.available && !tool.execState && $style.toolDim,
						]"
						:style="{ left: `${tool.x - TOOL_SIZE / 2}px`, top: `${tool.y - TOOL_SIZE / 2}px` }"
					>
						<svg
							viewBox="0 0 24 24"
							:class="$style.toolIcon"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="3.4" />
							<path
								d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
								stroke-linecap="round"
							/>
						</svg>
						<span v-if="tool.execState === 'done'" :class="[$style.badge, $style.badgeAchieved]"
							>✓</span
						>
						<span v-else-if="tool.execState === 'error'" :class="[$style.badge, $style.badgeFailed]"
							>✕</span
						>
					</div>
					<div
						:class="$style.toolLabel"
						:style="{ left: `${tool.x - 70}px`, top: `${tool.y + TOOL_SIZE / 2 + 4}px` }"
					>
						{{ tool.name }}
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
						<span :class="$style.slotName" :title="slot.name">{{ slot.name }}</span>
						<span
							:class="[
								$style.slotBadge,
								slot.source === 'agent' ? $style.badgeAgent : $style.badgeTool,
							]"
						>
							{{ slot.source }}
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

.toolIcon {
	width: 24px;
	height: 24px;
}

.toolLabel {
	position: absolute;
	width: 140px;
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
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

.badgeAgent {
	color: var(--color--secondary);
	background: var(--color--secondary--tint-3, rgba(124, 58, 237, 0.14));
}

.badgeTool {
	color: var(--color--success);
	background: var(--color--success--tint-3, rgba(13, 148, 136, 0.14));
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
</style>
