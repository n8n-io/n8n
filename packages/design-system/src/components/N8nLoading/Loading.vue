<template>
	<el-skeleton :loading="loading" :animated="animated" class="n8n-loading">
		<template slot="template">
			<el-skeleton-item
				v-if="variant === 'button'"
				:variant="variant"
			/>

			<div v-if="variant === 'h1'">
				<div
					v-for="(item, index) in rows"
					:key="index"
					:class="{
						[$style.h1Last]: item === rows && rows > 1 && shrinkLast,
					}"
				>
					<el-skeleton-item
						:variant="variant"
					/>
				</div>
			</div>
			<el-skeleton-item
				v-if="variant === 'image'"
				:variant="variant"
			/>
			<div v-if="variant === 'p'">
				<div
					v-for="(item, index) in rows"
					:key="index"
					:class="{
						[$style.pLast]: item === rows && rows > 1 && shrinkLast,
					}">
						<el-skeleton-item
							:variant="variant"
						/>
				</div>
			</div>
		</template>
	</el-skeleton>
</template>

<script lang="ts">
import ElSkeleton from 'element-ui/lib/skeleton';
import ElSkeletonItem from 'element-ui/lib/skeleton-item';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-loading',
	components: {
		ElSkeleton,
		ElSkeletonItem,
	},
	props: {
		animated: {
			type: Boolean,
			default: true,
		},
		loading: {
			type: Boolean,
			default: true,
		},
		rows: {
			type: Number,
			default: 1,
		},
		shrinkLast: {
			type: Boolean,
			default: true,
		},
		variant: {
			type: String,
			default: 'p',
			validator: (value: string): boolean => ['p', 'h1', 'button', 'image'].includes(value),
		},
	},
});
</script>

<style lang="scss" module>
.h1Last {
  width: 40%;
}

.pLast {
  width: 61%;
}
</style>
