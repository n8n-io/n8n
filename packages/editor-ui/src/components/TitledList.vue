<template>
	<div class="titled-list">
		<p v-text="title" />
		<ul>
			<li v-for="item in items" :key="item" class="titled-list-item" v-html="item" />
		</ul>
	</div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';

export default defineComponent({
	name: 'TitledList',
	props: {
		title: {
			type: String,
			required: true,
		},
		items: {
			type: Array as PropType<string[]>,
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
