<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { DEFAULT_AGENT_PERSONALISATION, type AgentJsonConfig } from '@n8n/api-types';

import type { SetupTask, SetupTaskId } from './agentSetupTasks.registry';
import { N8nIcon, N8nText, N8nToggle } from '@n8n/design-system';

const props = defineProps<{
	tasks: Array<SetupTask<SetupTaskId>>;
	personalisation?: AgentJsonConfig['personalisation'] | null;
}>();

const emit = defineEmits<{
	action: [task: SetupTask<SetupTaskId>];
}>();

const i18n = useI18n();

const isMinimised = ref(true);
const isPeekEnabled = ref(false);

const beamStyle = computed(() => {
	if (!props.personalisation) return undefined;

	const gradient = { ...DEFAULT_AGENT_PERSONALISATION.gradient, ...props.personalisation.gradient };
	return {
		'--agent-personalisation-gradient-from': gradient.from,
		'--agent-personalisation-gradient-to': gradient.to,
		'--agent-personalisation-gradient-angle': `${gradient.angle}deg`,
		'--agent-personalisation-gradient-from-stop': `${gradient.fromStop}%`,
		'--agent-personalisation-gradient-to-stop': `${gradient.toStop}%`,
	};
});

const areTasksResolved = computed(() => props.tasks.every((task) => task.state !== 'unknown'));

const sortedList = computed(() => {
	return props.tasks
		.filter((task) => task.visible)
		.toSorted((a, b) => Number(a.state === 'complete') - Number(b.state === 'complete'));
});

const remainingTaskCount = computed(() => {
	return props.tasks.filter((task) => task.state !== 'complete').length;
});

const completedTaskCount = computed(() => {
	return props.tasks.filter((task) => task.state === 'complete').length;
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

watch(areTasksResolved, (resolved) => {
	if (resolved && remainingTaskCount.value > 0) {
		isMinimised.value = false;
	}
});
</script>

<template>
	<div
		role="complementary"
		:class="[
			$style.container,
			{
				[$style.hasBorderBeam]: !isMinimised,
				[$style.isMinimised]: isMinimised,
				[$style.isPeekEnabled]: isPeekEnabled,
				[$style.hasPersonalisation]: !!personalisation,
			},
		]"
		:style="beamStyle"
		data-testid="agent-setup-tasks"
	>
		<div aria-hidden="true" :class="$style.borderBeamStroke" />
		<div
			:class="[$style.header, { [$style.isClickable]: isMinimised }]"
			data-testid="agent-setup-tasks-header"
			@click="maximise"
		>
			<div :class="$style.headerContent">
				<N8nText tag="h3" bold>
					{{ i18n.baseText('agents.builder.setupTasks.title') }}
				</N8nText>
				<N8nText color="text-light" step="xs">
					{{ completedTaskCount }} / {{ sortedList.length }}
				</N8nText>
			</div>
			<N8nToggle
				:icon="isMinimised ? 'chevron-up' : 'chevron-down'"
				variant="ghost"
				icon-size="large"
				size="small"
				:class="$style.minimiseToggle"
				:label="isMinimised ? i18n.baseText('generic.expand') : i18n.baseText('generic.collapse')"
				@click.stop="toggleMinimise"
			/>
		</div>
		<TransitionGroup
			v-if="areTasksResolved"
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
					<N8nIcon v-if="task.state === 'complete'" icon="check" size="small" :stroke-width="2.5" />
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

/* stylelint-disable */
@property --agent-setup-beam-angle {
	syntax: '<angle>';
	initial-value: 0deg;
	inherits: true;
}

@property --agent-setup-beam-opacity {
	syntax: '<number>';
	initial-value: 0;
	inherits: true;
}

@property --agent-setup-beam-hover-opacity {
	syntax: '<number>';
	initial-value: 1;
	inherits: true;
}
/* stylelint-enable */

.container {
	@include popover.popover-surface;

	position: fixed;
	isolation: isolate;
	bottom: var(--n8n-agent-setup-task-list--padding);
	right: var(--n8n-agent-setup-task-list--padding);
	display: flex;
	flex-direction: column;
	transform: translateY(0);
	transition:
		transform var(--duration--snappy) var(--easing--ease-out),
		--agent-setup-beam-hover-opacity calc(3 * var(--duration--snappy)) ease;

	@include motion.reduced-motion;

	&.hasBorderBeam {
		animation:
			agentSetupBeamSpin calc(4 * var(--duration--slow)) linear infinite,
			agentSetupBeamFadeIn calc(4 * var(--duration--slow)) linear infinite;

		@include motion.reduced-motion;

		&:hover {
			--agent-setup-beam-hover-opacity: 0;

			animation-play-state: paused, running;
			transition-duration: var(--duration--snappy), calc(var(--duration--slow) / 2);
		}
	}

	&.hasBorderBeam .borderBeamStroke {
		--agent-setup-beam-sweep-mask: conic-gradient(
			from var(--agent-setup-beam-angle),
			transparent 0% 30%,
			var(--color--white-alpha-100) 36%,
			var(--color--white-alpha-300) 44%,
			white 52% 80%,
			var(--color--white-alpha-300) 86%,
			var(--color--white-alpha-100) 92%,
			transparent 95% 100%
		);

		--agent-setup-beam-colours:
			radial-gradient(
				ellipse var(--spacing--3xl) var(--spacing--xl) at 33% -7%,
				var(--color--pink-500),
				transparent
			),
			radial-gradient(
				ellipse var(--spacing--4xl) var(--spacing--2xl) at 12% -5%,
				var(--color--blue-500),
				transparent
			),
			radial-gradient(
				ellipse var(--spacing--2xl) var(--spacing--3xl) at 2% 68%,
				var(--color--green-500),
				transparent
			),
			radial-gradient(
				ellipse var(--spacing--4xl) var(--spacing--xl) at 74% 100%,
				var(--color--purple-500),
				transparent
			),
			radial-gradient(
				ellipse var(--spacing--3xl) var(--spacing--xl) at 94% 0%,
				var(--color--orange-400),
				transparent
			),
			radial-gradient(
				ellipse var(--spacing--xl) var(--spacing--4xl) at 100% 27%,
				var(--color--pink-500),
				transparent
			);

		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		background:
			conic-gradient(
				from var(--agent-setup-beam-angle),
				transparent 0% 54%,
				var(--color--white-alpha-100) 57%,
				var(--color--white-alpha-300) 60%,
				var(--color--white-alpha-600) 63%,
				var(--color--white-alpha-700) 66%,
				var(--color--white-alpha-600) 69%,
				var(--color--white-alpha-300) 72%,
				var(--color--white-alpha-100) 75%,
				transparent 78% 100%
			),
			var(--agent-setup-beam-colours);
		z-index: 1;
		padding: 1.5px;
		opacity: calc(var(--agent-setup-beam-opacity) * var(--agent-setup-beam-hover-opacity));
		-webkit-mask:
			var(--agent-setup-beam-sweep-mask),
			linear-gradient(white 0 0) content-box,
			linear-gradient(white 0 0);
		-webkit-mask-composite: source-in, xor;
		mask:
			var(--agent-setup-beam-sweep-mask),
			linear-gradient(white 0 0) content-box,
			linear-gradient(white 0 0);
		mask-composite: intersect, exclude;
	}

	&.hasPersonalisation .borderBeamStroke {
		--agent-setup-beam-colours: linear-gradient(
			var(--agent-personalisation-gradient-angle),
			var(--agent-personalisation-gradient-from) var(--agent-personalisation-gradient-from-stop),
			var(--agent-personalisation-gradient-to) var(--agent-personalisation-gradient-to-stop)
		);

		@supports (background: linear-gradient(90deg in oklch, red, blue)) {
			--agent-setup-beam-colours: linear-gradient(
				var(--agent-personalisation-gradient-angle) in oklch,
				var(--agent-personalisation-gradient-from) var(--agent-personalisation-gradient-from-stop),
				var(--agent-personalisation-gradient-to) var(--agent-personalisation-gradient-to-stop)
			);
		}
	}

	&.isMinimised {
		transform: translateY(100%);

		&:focus-within,
		&.isPeekEnabled:hover,
		&:has(+ .peekTrigger:hover) {
			transform: translateY(calc(100% - calc(var(--height--xl) - var(--spacing--xs))));
		}

		.header {
			border-color: transparent;
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
	padding-inline: calc(var(--n8n-agent-setup-task-list--padding) / 2);
	height: calc(var(--height--xl) + var(--spacing--4xs));
	border-bottom: var(--border);
	border-color: var(--border-color--subtle);

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
	transform: translateY(1px);
}
.minimiseToggle {
	color: var(--text-color--subtle);
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

@keyframes agentSetupBeamSpin {
	0% {
		--agent-setup-beam-angle: 0deg;
	}

	50%,
	100% {
		--agent-setup-beam-angle: 360deg;
	}
}

@keyframes agentSetupBeamFadeIn {
	0% {
		--agent-setup-beam-opacity: 0;
	}

	50% {
		--agent-setup-beam-opacity: 1;
	}

	100% {
		--agent-setup-beam-opacity: 0;
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
