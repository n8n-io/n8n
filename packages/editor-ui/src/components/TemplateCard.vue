<template>
	<div>
		<div v-if="loading" :class="$style.loading">
			<div v-for="(block, index) in loadingBlocks" :key="'block-' + index">
				<n8n-loading
					:animated="loadingAnimated"
					:loading="loading"
					:rows="loadingRows"
					variant="p"
				/>
				<div :class="$style.spacer" />
			</div>
		</div>

		<div v-else :class="$style.card" @mouseover="hover = true" @mouseleave="hover = false">
			<div :class="$style.body">
				<n8n-heading :bold="true" size="medium">{{ shortTitle }}</n8n-heading>
				<div :class="$style.content">
					<slot name="footer"></slot>
				</div>
			</div>
			<div>
				<slot v-if="!hover" name="right"></slot>
				<slot v-if="hover" name="rightHover"></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ElSkeletonItem from 'element-ui/lib/skeleton-item';
import ElSkeleton from 'element-ui/lib/skeleton';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateCard',
	components: {
		ElSkeleton,
		ElSkeletonItem,
	},
	props: {
		loading: {
			type: Boolean,
		},
		loadingAnimated: {
			type: Boolean,
			default: true,
		},
		loadingBlocks: {
			type: Number,
			default: 2,
		},
		loadingRows: {
			type: Number,
			default: () => {
				return 1;
			},
		},
		title: String,
	},
	data() {
		return {
			hover: false,
		};
	},
	computed: {
		shortTitle(): string {
			if (this.title.length > 70) {
				return this.title.slice(0, 67) + '...';
			}
			return this.title;
		},
	},
});
</script>

<style lang="scss" module>
.loading {
	width: 100%;
	border-bottom: $--version-card-border;
	margin-right: var(--spacing-2xs);
	padding: 0 var(--spacing-s) var(--spacing-s);
}

.card {
	width: 100%;
	height: 68px;
	height: auto;
	border-bottom: $--version-card-border;
	margin-right: var(--spacing-2xs);
	padding: var(--spacing-s);
	display: flex;
	justify-content: space-between;
}

.content {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
}
</style>
