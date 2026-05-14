<script lang="ts" setup>
import type { BuilderV2Task } from '../builder-v2.api';

defineProps<{
	tasks: BuilderV2Task[];
}>();
</script>

<template>
	<div v-if="tasks.length > 0" :class="$style.taskList" data-test-id="builder-v2-task-list">
		<div :class="$style.heading">Plan</div>
		<ul :class="$style.list">
			<li
				v-for="task in tasks"
				:key="task.id"
				:class="[$style.item, $style[`status-${task.status}`]]"
				:data-task-status="task.status"
			>
				<span :class="[$style.pill, $style[`pill-${task.status}`]]">{{ task.status }}</span>
				<span :class="$style.title">{{ task.title }}</span>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.taskList {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	background: var(--color--background--light-2);
}

.heading {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--2xs);
	letter-spacing: 0.04em;
}

.list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	line-height: var(--line-height--md);
}

.title {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	font-size: var(--font-size--4xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius);
	letter-spacing: 0.04em;
	min-width: 52px;
}

.pill-pending {
	background: var(--color--background--light-3);
	color: var(--color--text--tint-1);
	border: var(--border);
}

.pill-active {
	background: var(--background--warning);
	color: var(--text-color--warning);
	border: 1px solid var(--border-color--warning);
}

.pill-done {
	background: var(--background--success);
	color: var(--text-color--success);
	border: 1px solid var(--border-color--success);
}

.status-done .title {
	text-decoration: line-through;
	color: var(--color--text--tint-1);
}
</style>
