<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system';

withDefaults(defineProps<{ rows?: number; immediate?: boolean }>(), {
	rows: 25,
	immediate: false,
});
</script>

<template>
	<div :class="['resource-list-loading', { 'resource-list-loading-instant': immediate }]">
		<N8nLoading :rows="rows" :shrink-last="false" />
	</div>
</template>

<style lang="scss" scoped>
.resource-list-loading {
	position: relative;
	height: 0;
	width: 100%;
	overflow: hidden;
	/*
	Show the loading skeleton only if the loading takes longer than 300ms
	*/
	animation: 0.01s linear 0.3s forwards changeVisibility;
	:deep(.el-skeleton) {
		position: absolute;
		height: 100%;
		width: 100%;
		overflow: hidden;

		> div {
			> div:first-child {
				.el-skeleton__item {
					height: 42px;
					margin: 0;
				}
			}
		}

		.el-skeleton__item {
			height: 69px;
		}
	}
}
.resource-list-loading-instant {
	animation: 0.01s linear 0s forwards changeVisibility;
}

@keyframes changeVisibility {
	from {
		height: 0;
	}
	to {
		height: 100%;
	}
}
</style>
