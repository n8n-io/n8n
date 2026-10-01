<script setup lang="ts">
import { computed, nextTick, ref, Transition, TransitionGroup, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonConfig } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';

import type { SetupTask, SetupTaskId } from './agentSetupTasks.registry';

const props = defineProps<{
	tasks: Array<SetupTask<SetupTaskId>>;
	personalisation?: AgentJsonConfig['personalisation'] | null;
}>();

const emit = defineEmits<{
	action: [task: SetupTask<SetupTaskId>];
}>();

const i18n = useI18n();
const isTriggerShimmering = ref(false);
const activeTaskIndex = ref(0);
const isPopoverOpen = ref(false);

const areTasksResolved = computed(() => props.tasks.every((task) => task.state !== 'unknown'));

const listRef = useTemplateRef<InstanceType<typeof TransitionGroup>>('list');

watch(isPopoverOpen, async (isOpen) => {
	if (!isOpen || !areTasksResolved.value) return;

	await nextTick();
	const listElement = listRef.value?.$el;
	if (listElement instanceof HTMLElement) listElement.focus();
});

const sortedList = computed(() => {
	return props.tasks
		.filter((task) => task.visible)
		.toSorted((a, b) => Number(a.state === 'complete') - Number(b.state === 'complete'));
});

const completedTaskCount = computed(() => {
	return sortedList.value.filter((task) => task.state === 'complete').length;
});

const completionPercentage = computed(() =>
	sortedList.value.length > 0 ? (completedTaskCount.value / sortedList.value.length) * 100 : 0,
);

const completedTasksAreGrouped = computed(() => completedTaskCount.value > 3);

const incompleteTasks = computed(() =>
	sortedList.value.filter((task) => task.state !== 'complete'),
);

const triggerLabel = computed(() =>
	i18n.baseText(
		incompleteTasks.value.length > 0
			? 'agents.builder.setupTasks.title'
			: 'agents.builder.setupTasks.done',
	),
);

function resetActiveTask() {
	activeTaskIndex.value = 0;
}

function setActiveTask(task: SetupTask<SetupTaskId>) {
	const index = incompleteTasks.value.findIndex((incompleteTask) => incompleteTask.id === task.id);
	if (index >= 0) activeTaskIndex.value = index;
}

function handleTaskKeydown(event: KeyboardEvent) {
	if (!isPopoverOpen.value) return;
	event.preventDefault();

	switch (event.key) {
		case 'ArrowUp':
			return activeTaskIndex.value > 0 && (activeTaskIndex.value = activeTaskIndex.value - 1);
		case 'ArrowDown':
			return (
				activeTaskIndex.value < incompleteTasks.value.length - 1 &&
				(activeTaskIndex.value = activeTaskIndex.value + 1)
			);
		case 'Enter':
		case ' ': {
			const task = incompleteTasks.value[activeTaskIndex.value];
			if (task) emit('action', task);
			return;
		}
	}
}
</script>

<template>
	<N8nPopover
		v-model:open="isPopoverOpen"
		:suppress-auto-focus="true"
		side="bottom"
		align="end"
		width="280px"
		:content-class="$style.popoverContent"
		@before-enter="resetActiveTask"
	>
		<template #trigger>
			<button
				:class="[
					$style.trigger,
					{ [$style.triggerShimmer]: isTriggerShimmering && !isPopoverOpen },
				]"
				@animationend.self="isTriggerShimmering = true"
			>
				<svg
					v-if="incompleteTasks.length > 0"
					:class="$style.progressWheel"
					viewBox="0 0 20 20"
					fill="none"
					stroke-width="2"
					role="progressbar"
					:aria-label="i18n.baseText('agents.builder.setupTasks.title')"
					:aria-valuenow="completionPercentage"
					:aria-valuemin="0"
					:aria-valuemax="100"
				>
					<circle :class="$style.progressTrack" cx="10" cy="10" r="8" />
					<circle
						:class="$style.progressValue"
						cx="10"
						cy="10"
						r="8"
						pathLength="100"
						stroke-dasharray="100"
						:stroke-dashoffset="100 - completionPercentage"
						transform="rotate(-90 10 10)"
					/>
				</svg>
				<N8nIcon v-else icon="check" :size="20" />
				<N8nText :class="$style.triggerLabel" step="sm" bold>
					<Transition
						:enter-active-class="$style.labelEnter"
						:leave-active-class="$style.labelLeave"
					>
						<span :key="triggerLabel">{{ triggerLabel }}</span>
					</Transition>
				</N8nText>
			</button>
		</template>
		<template #content>
			<div :class="$style.container" data-testid="agent-setup-tasks">
				<div :class="$style.header" data-testid="agent-setup-tasks-header">
					<div :class="$style.headerContent">
						<N8nText tag="h3" color="text-light" bold>
							{{ i18n.baseText('agents.builder.setupTasks.title') }}
						</N8nText>
					</div>
				</div>
				<TransitionGroup
					v-if="areTasksResolved"
					ref="list"
					tag="ul"
					tabindex="-1"
					:class="$style.list"
					:move-class="$style.listMove"
					@keydown="handleTaskKeydown"
				>
					<li
						v-for="(task, index) in completedTasksAreGrouped ? incompleteTasks : sortedList"
						:key="task.id"
						role="button"
						:data-selected="activeTaskIndex === index"
						:class="[$style.listItem, { [$style.isComplete]: task.state === 'complete' }]"
						@mouseenter="setActiveTask(task)"
						@click="emit('action', task)"
					>
						<div :class="[$style.taskIcon, { [$style.isComplete]: task.state === 'complete' }]">
							<N8nIcon
								v-if="task.state === 'complete'"
								icon="check"
								size="small"
								:stroke-width="2.5"
							/>
						</div>
						<N8nText bold :class="$style.taskTitle">{{ i18n.baseText(task.titleKey) }}</N8nText>
						<N8nIcon icon="arrow-right" color="text-light" :class="$style.taskActionIcon" />
					</li>
					<li
						v-if="completedTasksAreGrouped"
						:key="'completed-tasks'"
						:class="[$style.listItem, $style.isComplete]"
					>
						<div :class="[$style.taskIcon, $style.isComplete]">
							<N8nIcon icon="check" size="small" :stroke-width="2.5" />
						</div>
						<N8nText bold :class="$style.taskTitle">
							{{
								i18n.baseText('agents.builder.setupTasks.tasksDone', {
									interpolate: { count: completedTaskCount.toString() },
								})
							}}
						</N8nText>
					</li>
				</TransitionGroup>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/mixins' as mixins;
@use '@n8n/design-system/css/mixins/utils' as utils;
@use '@n8n/design-system/css/mixins/_focus' as focus;
@use '@n8n/design-system/css/mixins/motion' as motion;

.popoverContent {
	padding: 0;
}

.trigger {
	--animation--fade-in--translate: 0;
	--animation--fade-in--blur: 0;

	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--2xs);
	width: fit-content;
	border: 1px solid transparent;
	padding-inline: var(--spacing--3xs);
	height: var(--height--md);
	border-radius: var(--radius--full);
	background-color: var(--color--purple-100);
	color: var(--color--purple-900);

	@include motion.fade-in;
	animation-delay: calc(var(--duration--slow) / 2);
	animation-fill-mode: backwards;

	&:hover,
	&[data-state='open'] {
		background-color: var(--color--purple-200);
	}

	&:focus-visible,
	&[data-state='open'] {
		background-color: var(--color--purple-200);
		@include focus.focus-ring-with-border;
	}

	> :global(.n8n-text) {
		padding-inline-end: var(--spacing--2xs);
	}
}

.triggerLabel {
	--animation--blur-swap--blur: var(--spacing--5xs);

	display: inline-grid;

	> span {
		grid-area: 1 / 1;
	}
}

.labelEnter {
	@include motion.blur-swap-in;
}

.labelLeave {
	@include motion.blur-swap-out;
}

.triggerShimmer::after {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: linear-gradient(
		110deg,
		transparent 20%,
		var(--color--pink-300) 38%,
		var(--color--blue-300) 50%,
		var(--color--orange-300) 62%,
		transparent 80%
	);
	mix-blend-mode: overlay;
	background-size: 200% 100%;
	background-repeat: repeat-x;
	opacity: 0;
	pointer-events: none;
	/** Use 1s for the sweep and hide the shimmer for 4s. */
	animation: triggerShimmer calc(var(--duration--slow) * 5) cubic-bezier(0.15, 0.5, 0.85, 0.5)
		infinite;

	@include motion.reduced-motion;
}

.triggerShimmer:hover::after {
	animation-play-state: paused;
}

@keyframes triggerShimmer {
	0% {
		background-position: 100% 0;
		opacity: 0;
	}
	2%,
	18% {
		opacity: 1;
	}
	20%,
	100% {
		background-position: -100% 0;
		opacity: 0;
	}
}

.container {
	--n8n-agent-setup-task-list--padding: var(--spacing--xs);
	display: flex;
	flex-direction: column;
	max-height: 240px;
	overflow: hidden;
}
.header {
	flex-shrink: 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--n8n-agent-setup-task-list--padding);
	padding-block-end: 0;
	user-select: none;
}
.headerContent {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
.progressWheel {
	flex-shrink: 0;
	width: var(--height--2xs);
	height: var(--height--2xs);
}
.progressTrack {
	stroke: var(--border-color);
}
.progressValue {
	stroke: var(--color--secondary);
	animation: progressFill var(--duration--snappy) var(--easing--ease-out) var(--duration--slow)
		backwards;

	@include motion.reduced-motion;
}

@keyframes progressFill {
	from {
		stroke-dashoffset: 100;
	}
}
.list {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-block: calc(var(--n8n-agent-setup-task-list--padding) / 2);
	padding-inline: var(--n8n-agent-setup-task-list--padding);

	@include mixins.hoverable-scroll-bar;
}
.listMove {
	transition: transform var(--duration--base) var(--easing--ease-out-quart);

	@include motion.reduced-motion;

	/** TransitionGroup needs to add custom transition to children. But svg icon needs to stay hidden unless we focus/hover **/
	> *:not(:global(.n8n-icon)) {
		animation: taskMoveBlur var(--duration--base) var(--easing--ease-out-quart);

		@include motion.reduced-motion;
	}
}
.listItem {
	display: flex;
	align-items: center;
	gap: calc(var(--n8n-agent-setup-task-list--padding) / 1.5);
	padding-inline: calc(var(--n8n-agent-setup-task-list--padding) / 2);
	height: var(--height--md);
	border-radius: var(--radius);
	margin-inline: calc(calc(var(--n8n-agent-setup-task-list--padding) / 2) * -1);
	background-color: transparent;
	user-select: none;
	cursor: pointer;
	border: 1px solid transparent;

	.taskActionIcon {
		margin-inline-start: auto;
		opacity: 0;
		flex-shrink: 0;
		min-width: 0;
	}

	&:not(.isComplete) {
		&:focus-visible,
		&[data-selected='true'] {
			background-color: var(--background--hover);
			.taskActionIcon {
				opacity: 1;
			}
		}
	}

	&.isComplete {
		opacity: 0.6;
		pointer-events: none;

		> :global(.n8n-text) {
			text-decoration: line-through;
		}
	}
}
.taskTitle {
	@include utils.utils-ellipsis;
}
.taskIcon {
	width: var(--height--2xs);
	height: var(--height--2xs);
	display: grid;
	place-items: center;
	border-radius: var(--radius--full);
	border: var(--border);
	box-shadow: inset 0 0 0 1px var(--border-color);
	flex-shrink: 0;
	min-width: 0;

	&.isComplete {
		background-color: var(--color--neutral-200);
		border-color: var(--color--neutral-200);
		box-shadow: none;
	}
}

@keyframes taskMoveBlur {
	0%,
	100% {
		filter: blur(0);
		opacity: 1;
	}

	50% {
		filter: blur(var(--spacing--5xs));
		opacity: 0.2;
	}
}
</style>
