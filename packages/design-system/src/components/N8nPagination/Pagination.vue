<script lang="ts">
import { defineComponent } from 'vue';
import { ElPagination } from 'element-plus';

export default defineComponent({
	props: {
		...ElPagination.props,
	},
	components: {
		ElPagination,
	},
});
</script>

<template>
	<el-pagination
		class="is-background"
		layout="prev, pager, next"
		v-bind="{ ...$props, ...$attrs }"
	/>
</template>
