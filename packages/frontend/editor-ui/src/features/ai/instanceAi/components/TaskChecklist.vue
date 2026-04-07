<script lang="ts" setup>
import { N8nIcon, type IconName } from '@n8n/design-system';
import type { TaskList } from '@n8n/api-types';

defineProps<{
	tasks?: TaskList;
}>();

const statusConfig: Record<string, { icon: IconName; spin: boolean; className: string }> = {
	todo: { icon: 'circle', spin: false, className: 'todoIcon' },
	in_progress: { icon: 'spinner', spin: true, className: 'activeIcon' },
	done: { icon: 'check', spin: false, className: 'doneIcon' },
	failed: { icon: 'triangle-alert', spin: false, className: 'failedIcon' },
	cancelled: { icon: 'x', spin: false, className: 'cancelledIcon' },
};

function getConfig(status: string) {
	return statusConfig[status] ?? statusConfig.todo;
}
</script>

<template>
	<div v-if="tasks?.tasks?.length" :class="$style.root">
		<div v-for="task in tasks.tasks" :key="task.id" :class="$style.row">
			<N8nIcon
				:icon="getConfig(task.status).icon"
				:spin="getConfig(task.status).spin"
				size="small"
				:class="$style[getConfig(task.status).className]"
			/>
			<span
				:class="[
					$style.label,
					task.status === 'done' && $style.labelDone,
					task.status === 'cancelled' && $style.labelCancelled,
				]"
			>
				{{ task.description }}
			</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: var(--spacing--2xs) 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.label {
	color: var(--color--text);
}

.labelDone {
	color: var(--color--text--tint-1);
}

.labelCancelled {
	color: var(--color--text--tint-2);
	text-decoration: line-through;
}

.todoIcon {
	color: var(--color--text--tint-2);
}

.activeIcon {
	color: var(--color--primary);
}

.doneIcon {
	color: var(--color--success);
}

.failedIcon {
	color: var(--color--danger);
}

.cancelledIcon {
	color: var(--color--text--tint-2);
}
</style>
