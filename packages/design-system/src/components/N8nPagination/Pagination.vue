<script lang="ts">
import { Pagination as ElPagination } from 'element-ui';

export default {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	props: (ElPagination as any).props,
	components: {
		ElPagination,
	},
};
</script>

<template>
	<div>
		<el-pagination
			background
			layout="prev, pager, next"
			v-bind="[$props, $attrs]"
			v-on="$listeners"
		/>
	</div>
</template>
