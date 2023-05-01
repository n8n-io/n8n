<script lang="ts">
import type { DefineComponent } from 'vue';
import { defineComponent } from 'vue';
import { Pagination as ElPagination } from 'element-ui';

export default defineComponent({
	props: (ElPagination as unknown as DefineComponent).props,
	components: {
		ElPagination,
	},
});
</script>

<template>
	<el-pagination
		background
		layout="prev, pager, next"
		v-bind="[$props, $attrs]"
		v-on="$listeners"
	/>
</template>
