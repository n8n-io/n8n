<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge } from '@n8n/design-system';
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

const statusLabels: Record<string, string> = {
	idle: 'Idle',
	active: 'Active',
	busy: 'Busy',
};

const statusLabel = computed(() => statusLabels[props.agent.status] ?? 'Idle');

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
		role="button"
		:aria-label="`Agent ${agent.firstName}`"
		tabindex="0"
		:class="[
			$style.card,
			{ [$style.selected]: selected },
			agent.status === 'active' ? $style.activeGlow : '',
			agent.status === 'busy' ? $style.busyGlow : '',
		]"
		:style="{
			left: `${agent.position.x}px`,
			top: `${agent.position.y}px`,
		}"
		data-testid="agent-card"
		@pointerdown="onPointerDown"
	>
		<!-- Zone accent -->
		<span v-if="zoneColor" :class="$style.zoneAccent" :style="{ backgroundColor: zoneColor }" />

		<!-- Top row: avatar + name + status -->
		<div :class="$style.topRow">
			<AgentAvatarComp :avatar="agent.avatar" size="medium" />
			<div :class="$style.info">
				<div :class="$style.name">{{ agent.firstName }}</div>
				<div :class="$style.role">{{ agent.role }}</div>
			</div>
			<N8nBadge
				:theme="
					agent.status === 'active' ? 'success' : agent.status === 'busy' ? 'warning' : 'default'
				"
				size="small"
			>
				{{ statusLabel }}
			</N8nBadge>
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
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: grab;
	user-select: none;
	z-index: 3;
	transition:
		box-shadow 0.15s ease,
		border-color 0.3s ease,
		color 0.3s ease;
	min-width: 220px;
	max-width: 260px;

	&:hover {
		border-color: var(--color--primary);
	}

	&:active {
		cursor: grabbing;
	}
}

.zoneAccent {
	position: absolute;
	top: 0;
	left: 0;
	width: 3px;
	height: 100%;
	border-radius: var(--radius--lg) 0 0 var(--radius--lg);
}

.selected {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 1px var(--color--primary);
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

.activeGlow {
	animation: activeGlowPulse 2s ease-in-out infinite;
}

.busyGlow {
	animation: busyGlowPulse 1.5s ease-in-out infinite;
}

@keyframes activeGlowPulse {
	0%,
	100% {
		box-shadow:
			0 0 8px color-mix(in srgb, var(--color--success) 30%, transparent),
			0 1px 3px color-mix(in srgb, var(--color--text) 6%, transparent);
	}

	50% {
		box-shadow:
			0 0 20px color-mix(in srgb, var(--color--success) 50%, transparent),
			0 0 40px color-mix(in srgb, var(--color--success) 20%, transparent);
	}
}

@keyframes busyGlowPulse {
	0%,
	100% {
		box-shadow:
			0 0 8px color-mix(in srgb, var(--color--warning) 30%, transparent),
			0 1px 3px color-mix(in srgb, var(--color--text) 6%, transparent);
	}

	50% {
		box-shadow:
			0 0 20px color-mix(in srgb, var(--color--warning) 50%, transparent),
			0 0 40px color-mix(in srgb, var(--color--warning) 20%, transparent);
	}
}
</style>
