<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { SetupTask, SetupTaskId } from './agentSetupTasks.registry';
import { N8nIcon, N8nText, N8nToggle } from '@n8n/design-system';

const props = defineProps<{
	tasks: Array<SetupTask<SetupTaskId>>;
}>();

const i18n = useI18n();

const isMinimised = ref(false);

const sortedList = computed(() => {
	return props.tasks.toSorted(
		(a, b) => Number(a.state === 'complete') - Number(b.state === 'complete'),
	);
});

const remainingTaskCount = computed(() => {
	return props.tasks.filter((task) => task.state !== 'complete').length;
});

function toggleMinimise() {
	isMinimised.value = !isMinimised.value;
}
</script>

<template>
	<div role="complementary" :class="$style.container" data-testid="agent-setup-tasks">
		<div :class="$style.header">
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
				:icon="isMinimised ? 'maximize-2' : 'minimize-2'"
				variant="ghost"
				icon-size="medium"
				size="small"
				:label="
					isMinimised
						? i18n.baseText('agents.builder.setupTasks.maximize')
						: i18n.baseText('agents.builder.setupTasks.minimize')
				"
				@click="toggleMinimise"
			/>
		</div>
		<ul :class="$style.list">
			<li
				v-for="task in sortedList"
				:key="task.id"
				role="button"
				:class="[$style.listItem, { [$style.isComplete]: task.state === 'complete' }]"
			>
				<div :class="[$style.taskIcon, { [$style.isComplete]: task.state === 'complete' }]">
					<N8nIcon v-if="task.state === 'complete'" icon="check" />
				</div>
				<N8nText bold :class="$style.taskTitle">{{ i18n.baseText(task.titleKey) }}</N8nText>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/popover' as popover;
@use '@n8n/design-system/css/mixins/mixins' as mixins;

.container {
	@include popover.popover-surface;

	--n8n-agent-setup-task-list--min-width: 20rem;
	--n8n-agent-setup-task-list--max-width: 40rem;

	--n8n-agent-setup-task-list--padding: var(--spacing--sm);

	position: fixed;
	bottom: var(--n8n-agent-setup-task-list--padding);
	right: var(--n8n-agent-setup-task-list--padding);
	display: flex;
	flex-direction: column;
	width: clamp(
		var(--n8n-agent-setup-task-list--min-width),
		16dvw,
		var(--n8n-agent-setup-task-list--max-width)
	);
	aspect-ratio: 4/3;
}
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-block-start: var(--spacing--xs);
	padding-inline: calc(var(--n8n-agent-setup-task-list--padding) / 2);
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
	padding-block-start: var(--n8n-agent-setup-task-list--padding);
	padding-inline: var(--n8n-agent-setup-task-list--padding);

	@include mixins.hoverable-scroll-bar;
	@include mixins.scroll-mask(top);
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
	cursor: default;

	&:not(.isComplete) {
		&:hover {
			background-color: var(--background-color--hover);
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
.taskIcon {
	width: var(--height--2xs);
	height: var(--height--2xs);
	display: grid;
	place-items: center;
	border-radius: var(--radius--full);
	border: var(--border);
	box-shadow: inset 0 0 0 1px var(--border-color);

	&.isComplete {
		background-color: var(--color--neutral-200);
		border-color: var(--color--neutral-200);
		box-shadow: none;
	}
}
</style>
