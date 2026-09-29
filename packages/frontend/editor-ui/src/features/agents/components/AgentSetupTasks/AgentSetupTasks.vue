<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { SetupTask, SetupTaskId } from './agentSetupTasks.registry';
import { N8nIcon, N8nText, N8nToggle } from '@n8n/design-system';

const props = defineProps<{
	tasks: Array<SetupTask<SetupTaskId>>;
}>();

const emit = defineEmits<{
	action: [task: SetupTask<SetupTaskId>];
}>();

const i18n = useI18n();

const isMinimised = ref(false);
const isPeekEnabled = ref(false);

const sortedList = computed(() => {
	return props.tasks
		.filter((task) => task.visible)
		.toSorted((a, b) => Number(a.state === 'complete') - Number(b.state === 'complete'));
});

const remainingTaskCount = computed(() => {
	return props.tasks.filter((task) => task.state !== 'complete').length;
});

function toggleMinimise() {
	isMinimised.value = !isMinimised.value;
	isPeekEnabled.value = false;
}

function enablePeek() {
	isPeekEnabled.value = true;
}

function maximise() {
	if (isMinimised.value) {
		toggleMinimise();
	}
}
</script>

<template>
	<div
		role="complementary"
		:class="[
			$style.container,
			{
				[$style.isMinimised]: isMinimised,
				[$style.isPeekEnabled]: isPeekEnabled,
			},
		]"
		data-testid="agent-setup-tasks"
	>
		<div
			:class="[$style.header, { [$style.isClickable]: isMinimised }]"
			data-testid="agent-setup-tasks-header"
			@click="maximise"
		>
			<div :class="$style.headerContent">
				<N8nText tag="h3" step="md" bold>
					{{ i18n.baseText('agents.builder.setupTasks.title') }}
				</N8nText>
				<N8nText color="text-light" step="xs" bold>
					{{
						i18n.baseText('agents.builder.setupTasks.remaining', {
							interpolate: { count: remainingTaskCount },
						})
					}}
				</N8nText>
			</div>
			<N8nToggle
				:icon="isMinimised ? 'chevron-up' : 'chevron-down'"
				variant="ghost"
				icon-size="medium"
				size="small"
				:label="
					isMinimised
						? i18n.baseText('agents.builder.setupTasks.maximize')
						: i18n.baseText('agents.builder.setupTasks.minimize')
				"
				@click.stop="toggleMinimise"
			/>
		</div>
		<TransitionGroup
			tag="ul"
			:class="$style.list"
			:move-class="$style.listMove"
			:inert="isMinimised"
		>
			<li
				v-for="task in sortedList"
				:key="task.id"
				role="button"
				tabindex="0"
				:class="[$style.listItem, { [$style.isComplete]: task.state === 'complete' }]"
				@click="emit('action', task)"
				@keydown.enter.prevent="emit('action', task)"
				@keydown.space.prevent="emit('action', task)"
			>
				<div :class="[$style.taskIcon, { [$style.isComplete]: task.state === 'complete' }]">
					<N8nIcon v-if="task.state === 'complete'" icon="check" />
				</div>
				<N8nText bold :class="$style.taskTitle">{{ i18n.baseText(task.titleKey) }}</N8nText>
				<N8nIcon icon="arrow-right" color="text-light" :class="$style.taskActionIcon" />
			</li>
		</TransitionGroup>
	</div>
	<div
		v-if="isMinimised"
		aria-hidden="true"
		:class="$style.peekTrigger"
		data-testid="agent-setup-tasks-peek-trigger"
		@pointerenter="enablePeek"
	/>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/common/var';
@use '@n8n/design-system/css/mixins/popover' as popover;
@use '@n8n/design-system/css/mixins/mixins' as mixins;
@use '@n8n/design-system/css/mixins/utils' as utils;
@use '@n8n/design-system/css/mixins/_focus' as focus;
@use '@n8n/design-system/css/mixins/motion' as motion;

.container,
.peekTrigger {
	--n8n-agent-setup-task-list--min-width: 20rem;
	--n8n-agent-setup-task-list--max-width: 40rem;
	--n8n-agent-setup-task-list--padding: var(--spacing--sm);

	width: clamp(
		var(--n8n-agent-setup-task-list--min-width),
		16dvw,
		var(--n8n-agent-setup-task-list--max-width)
	);
}

.container {
	@include popover.popover-surface;

	position: fixed;
	bottom: var(--n8n-agent-setup-task-list--padding);
	right: var(--n8n-agent-setup-task-list--padding);
	display: flex;
	flex-direction: column;
	aspect-ratio: 4/3;
	transform: translateY(0);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;

	&.isMinimised {
		transform: translateY(100%);

		&:focus-within,
		&.isPeekEnabled:hover,
		&:has(+ .peekTrigger:hover) {
			transform: translateY(calc(100% - calc(var(--height--xl) - var(--spacing--3xs))));
		}
	}
}
.peekTrigger {
	position: fixed;
	right: var(--n8n-agent-setup-task-list--padding);
	bottom: var(--n8n-agent-setup-task-list--padding);
	height: calc(var(--height--xl) * 2);
	background: transparent;
	z-index: var.$index-popper - 1;
}
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-block-start: var(--spacing--xs);
	padding-inline: calc(var(--n8n-agent-setup-task-list--padding) / 2);
	max-height: var(--height--xl);

	&.isClickable {
		cursor: pointer;
	}
}
.headerContent {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding-inline: calc(var(--n8n-agent-setup-task-list--padding) / 2);
}
.list {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-block-start: calc(var(--n8n-agent-setup-task-list--padding) / 1.25);
	padding-inline: var(--n8n-agent-setup-task-list--padding);

	@include mixins.hoverable-scroll-bar;
	@include mixins.scroll-mask(y);
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
		&:hover,
		&:focus-visible {
			background-color: var(--background--hover);
			.taskActionIcon {
				opacity: 1;
			}
		}
		&:focus-visible {
			@include focus.focus-ring-with-border;
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
