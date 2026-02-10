<script setup lang="ts">
import { computed } from 'vue';
import type { AgentNode } from './agents.types';
import AgentAvatarComp from './components/AgentAvatar.vue';

const props = defineProps<{
	agent: AgentNode;
	selected: boolean;
	zoneColor: string | null;
}>();

const emit = defineEmits<{
	dragStart: [id: string, event: PointerEvent];
}>();

const statusConfig: Record<string, { color: string; label: string }> = {
	idle: { color: 'var(--color--foreground--tint-1)', label: 'Idle' },
	active: { color: 'var(--color--success)', label: 'Active' },
	busy: { color: 'var(--color--warning)', label: 'Busy' },
};

const status = computed(() => statusConfig[props.agent.status] ?? statusConfig.idle);

const resourceBarColor = computed(() => {
	const usage = props.agent.resourceUsage;
	if (usage > 0.7) return 'var(--color--warning)';
	if (usage > 0.4) return 'var(--color--success)';
	return 'var(--color--foreground--tint-1)';
});

function onPointerDown(event: PointerEvent) {
	emit('dragStart', props.agent.id, event);
}
</script>

<template>
	<div
		:class="[$style.card, { [$style.selected]: selected }]"
		:style="{
			left: `${agent.position.x}px`,
			top: `${agent.position.y}px`,
			borderLeftColor: zoneColor ?? undefined,
			borderLeftWidth: zoneColor ? '3px' : undefined,
		}"
		data-testid="agent-card"
		@pointerdown="onPointerDown"
	>
		<!-- Top row: avatar + name + status -->
		<div :class="$style.topRow">
			<AgentAvatarComp :avatar="agent.avatar" size="medium" />
			<div :class="$style.info">
				<div :class="$style.name">{{ agent.firstName }}</div>
				<div :class="$style.role">{{ agent.role }}</div>
			</div>
			<div :class="$style.statusBadge" :style="{ '--status--color': status.color }">
				<span :class="$style.statusDot" />
				<span :class="$style.statusLabel">{{ status.label }}</span>
			</div>
		</div>

		<!-- Stats row -->
		<div :class="$style.statsRow">
			<div :class="$style.stat">
				<span :class="$style.statValue">{{ agent.workflowCount }}</span>
				<span :class="$style.statLabel">workflows</span>
			</div>
			<div :class="$style.statDivider" />
			<div :class="$style.stat">
				<span :class="$style.statValue">{{ agent.tasksCompleted }}</span>
				<span :class="$style.statLabel">tasks</span>
			</div>
			<div :class="$style.statDivider" />
			<div :class="$style.stat">
				<span :class="$style.statValue">{{ agent.lastActive }}</span>
				<span :class="$style.statLabel">last active</span>
			</div>
		</div>

		<!-- Resource bar -->
		<div :class="$style.resourceRow">
			<div :class="$style.resourceTrack">
				<div
					:class="$style.resourceFill"
					:style="{
						width: `${agent.resourceUsage * 100}%`,
						backgroundColor: resourceBarColor,
					}"
				/>
			</div>
			<span :class="$style.resourceLabel">{{ Math.round(agent.resourceUsage * 100) }}%</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	position: absolute;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow:
		0 1px 3px color-mix(in srgb, var(--color--text) 6%, transparent),
		0 1px 2px color-mix(in srgb, var(--color--text) 4%, transparent);
	cursor: grab;
	user-select: none;
	z-index: 3;
	transition:
		box-shadow 0.15s ease,
		transform 0.15s ease;
	min-width: 220px;
	max-width: 260px;

	&:hover {
		box-shadow:
			0 4px 12px color-mix(in srgb, var(--color--text) 10%, transparent),
			0 2px 4px color-mix(in srgb, var(--color--text) 6%, transparent);
		transform: translateY(-1px);
	}

	&:active {
		cursor: grabbing;
		box-shadow:
			0 8px 20px color-mix(in srgb, var(--color--text) 14%, transparent),
			0 4px 8px color-mix(in srgb, var(--color--text) 8%, transparent);
		transform: translateY(-2px);
	}
}

.selected {
	outline: 2px solid var(--color--primary);
	outline-offset: 2px;
	animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
	0%,
	100% {
		outline-color: var(--color--primary);
	}
	50% {
		outline-color: var(--color--primary--tint-2);
	}
}

.topRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.info {
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
	flex: 1;
}

.name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.role {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	white-space: nowrap;
}

.statusBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 2px var(--spacing--3xs);
	border-radius: var(--radius);
	background: color-mix(in srgb, var(--status--color) 12%, transparent);
	flex-shrink: 0;
	margin-left: auto;
}

.statusDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--status--color);
}

.statusLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.3px;
}

.statsRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--4xs);
	border-top: 1px solid var(--color--foreground--tint-2);
}

.stat {
	display: flex;
	align-items: baseline;
	gap: 3px;
	min-width: 0;
}

.statValue {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.statLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	white-space: nowrap;
}

.statDivider {
	width: 1px;
	height: 12px;
	background: var(--color--foreground--tint-2);
	flex-shrink: 0;
}

.resourceRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.resourceTrack {
	flex: 1;
	height: 4px;
	background: var(--color--foreground--tint-2);
	border-radius: 2px;
	overflow: hidden;
}

.resourceFill {
	height: 100%;
	border-radius: 2px;
	transition: width 0.3s ease;
}

.resourceLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	min-width: 28px;
	text-align: right;
}
</style>
