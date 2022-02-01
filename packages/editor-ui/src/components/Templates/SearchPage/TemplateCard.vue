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
		<div v-else :class="$style.card">
			<div :class="$style.body">
				<n8n-heading :bold="true" size="small">{{ title }}</n8n-heading>
				<div :class="$style.content">
					<slot name="footer"></slot>
				</div>
			</div>
			<div>
				<slot name="button"></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateCard',
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
	min-height: 68px;
	margin-right: var(--spacing-2xs);
	padding: var(--spacing-s);
	background-color: var(--color-background-xlight);
	border-bottom: $--version-card-border;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.content {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
}
</style>
