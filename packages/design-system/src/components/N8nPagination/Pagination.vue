<script lang="ts">
import { defineComponent } from 'vue';
import { ElPagination } from 'element-plus';

export default defineComponent({
	components: {
		ElPagination,
	},
	props: {
		...ElPagination.props,
	},
});
</script>

<template>
	<ElPagination
		class="is-background"
		layout="prev, pager, next"
		v-bind="{ ...$props, ...$attrs }"
	/>
</template>
