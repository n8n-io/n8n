<script lang="ts" setup>
defineProps<{
	title: string;
	items: string[];
}>();
</script>

<template>
	<div class="titled-list">
		<p v-text="title" />
		<ul>
			<li v-for="item in items" :key="item" class="titled-list-item" v-n8n-html="item" />
		</ul>
	</div>
</template>

<style lang="scss" scoped>
.titled-list {
	display: flex;
	flex-direction: column;

	.titled-list-item {
		list-style: none;
		padding-left: var(--spacing-3xs);
		&::before {
			content: '- ';
		}
	}
}
</style>
