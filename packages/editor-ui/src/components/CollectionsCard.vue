<template>
	<div :class="$style.card">
		<div v-if="loading">
			<el-skeleton :rows="6" :loading="loading" animated>
				<template slot="template">
					<el-skeleton-item variant="p" />
					<el-skeleton-item variant="p" />
					<el-skeleton-item variant="p" style="width: 60%" />

					<footer :class="$style.cardFooter">
						<el-skeleton-item variant="text" style="width: 30%" />
						<el-skeleton-item variant="text" style="width: 30%" />
					</footer>
				</template>
			</el-skeleton>
		</div>
		<div :class="$style.container" v-else>
			<n8n-heading :bold="true" size="medium">{{ shortTitle }}</n8n-heading>
			<div :class="$style.footer">
				<slot name="footer"></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import ElSkeleton from 'element-ui/lib/skeleton';
import ElSkeletonItem from 'element-ui/lib/skeleton-item';

export default mixins(genericHelpers).extend({
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
			if (this.title.length > 90) {
				return this.title.slice(0, 87) + '...';
			}
			return this.title;
		},
	},
});
</script>

<style lang="scss" module>
.card {
	width: 100%;
	height: 140px;
	border-radius: var(--border-radius-large);
	border: $--version-card-border;
	margin-right: var(--spacing-2xs);
	background-color: var(--color-white);
	padding: var(--spacing-s);
}

.container {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.footer {
	display: flex;
	justify-content: space-between;
}
</style>
