<template>
	<div :class="$style.card">
		<div :class="$style.container">
			<n8n-heading v-if="!loading" :bold="true" size="small">{{ shortTitle }}</n8n-heading>
			<n8n-loading :animated="true" :loading="loading" :rows="3" variant="p" />
			<div :class="$style.footer">
				<slot name="footer"></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'CollectionsCard',
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
