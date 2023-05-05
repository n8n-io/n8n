<template>
	<div class="titled-list">
		<p v-text="title" />
		<ul>
			<li v-for="item in items" class="titled-list-item" :key="item" v-html="item" />
		</ul>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'TitledList',
	props: {
		title: {
			type: String,
		},
		items: {
			type: Array,
			default: () => [],
		},
	},
});
</script>
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
