<template>
	<el-skeleton :loading="loading" :animated="animated">
		<template slot="template">
			<el-skeleton-item
				v-if="variant === 'button'"
				:variant="variant"
			/>
			<div v-if="variant === 'h1'">
				<el-skeleton-item
					v-for="(item, index) in rows"
					:key="`${index}-${item}`"
					:class="{
						'el-skeleton__h1--last': item === rows && rows > 1,
					}"
					:variant="variant"
				/>
			</div>
			<el-skeleton-item
				v-if="variant === 'image'"
				:variant="variant"
			/>
			<div v-if="variant === 'p'">
				<el-skeleton-item
					class="el-skeleton__paragraph"
					v-for="(item, index) in rows"
					:key="`${index}-${item}`"
					:class="{
						'last': item === rows && rows > 1,
					}"
					:variant="variant"
				/>
			</div>
		</template>
	</el-skeleton>
</template>

<script lang="ts">
import ElSkeleton from 'element-ui/lib/skeleton';
import ElSkeletonItem from 'element-ui/lib/skeleton-item';

export default {
	name: 'n8n-loading',
	components: {
		ElSkeleton,
		ElSkeletonItem,
	},
	props: {
		animated: {
			type: Boolean,
		},
		loading: {
			type: Boolean,
		},
		rows: {
			type: Number,
		},
		variant: {
			type: String,
		},
	},
};
</script>
