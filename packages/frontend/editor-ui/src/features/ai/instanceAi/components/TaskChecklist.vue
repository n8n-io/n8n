<script lang="ts" setup>
import type { TaskList } from '@n8n/api-types';
import { N8nCard, N8nIcon, N8nText, type IconName, type TextColor } from '@n8n/design-system';
import { computed } from 'vue';
import ButtonLike from './ButtonLike.vue';

const props = defineProps<{
	tasks?: TaskList;
}>();

type StatusConfig = {
	icon: IconName;
	spin?: boolean;
	color: TextColor;
	textColor?: TextColor;
	lineThrough?: boolean;
};

const statusConfig: Record<string, StatusConfig> = {
	todo: { icon: 'circle', color: 'text-xlight' },
	in_progress: {
		icon: 'spinner',
		spin: true,
		color: 'primary',
	},
	done: { icon: 'check', color: 'success', textColor: 'text-light' },
	failed: { icon: 'triangle-alert', color: 'danger' },
	cancelled: {
		icon: 'x',
		color: 'text-xlight',
		lineThrough: true,
	},
};

function getConfig(status: string) {
	return statusConfig[status] ?? statusConfig.todo;
}

const taskList = computed(() =>
	(props.tasks?.tasks ?? []).map((task) => {
		const config = getConfig(task.status);

		return {
			...task,
			...config,
		};
	}),
);
</script>

<template>
	<N8nCard v-if="taskList.length">
		<ButtonLike v-for="task in taskList" :key="task.id">
			<N8nIcon :icon="task.icon" :spin="task.spin" size="small" :color="task.color" />
			<span :class="$style.content">
				<N8nText :color="task.textColor" :class="{ [$style.lineThrough]: task.lineThrough }">
					{{ task.description }}
				</N8nText>
				<N8nText v-if="task.detail" size="small" color="text-light" :class="$style.detail">
					{{ task.detail }}
				</N8nText>
			</span>
		</ButtonLike>
	</N8nCard>
</template>

<style lang="scss" module>
.content {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.detail {
	line-height: var(--font-line-height-regular);
}

.lineThrough {
	text-decoration: line-through;
}
</style>
