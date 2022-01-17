<template>
		<div :class="$style.collectionCard">
			<div v-if="loading">
				<el-skeleton :rows="6" :loading="loading" animated>
					<template slot="template">
						<el-skeleton-item variant="p" />
						<el-skeleton-item variant="p" />
						<el-skeleton-item variant="p" style="width: 60%;" />

						<footer :class="$style.cardFooter">
							<el-skeleton-item variant="text" style="width: 30%;" />
							<el-skeleton-item variant="text" style="width: 30%;"/>
						</footer>
					</template>
				</el-skeleton>
			</div>
			<div v-else>
				<n8n-heading :bold="true" size="medium">{{shortTitle}}</n8n-heading>
				<footer :class="$style.cardFooter">
					<slot name="footer"></slot>
				</footer>
			</div>
		</div>
</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import ElSkeleton from 'element-ui/lib/skeleton';
import ElSkeletonItem from 'element-ui/lib/skeleton-item';

export default mixins(
	genericHelpers,
).extend({
	name: 'CollectionsCard',
	components: {
		ElSkeleton,
		ElSkeletonItem,
	},
	props: {
		title: String,
		loading: Boolean,
	},
	computed: {
		shortTitle(): string {
			// todo decide the length
			if (this.title.length > 90) {
				return this.title.slice(0, 87) + '...';
			}
			return this.title;
		},
	},
	methods: {
	},
});
</script>

<style lang="scss" module>

.collectionCard {
	width: 240px;
	height: 140px;
	border-radius: var(--border-radius-large);
	border: 1px solid #DBDFE7;
	margin-right: 8px;
	background-color: #FFFFFF;
	padding: 16px;

	.cardFooter {
		width: 212px;
		position: absolute;
		bottom: 16px;
		display: flex;
		justify-content: space-between;
	}
}

</style>
