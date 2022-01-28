<template>
	<div :class="$style.card" @click="redirectToCollectionPage(id)">
		<div :class="$style.container">
			<n8n-heading v-if="!loading" :bold="true" size="small">{{ title }}</n8n-heading>
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
		id: String,
		loading: Boolean,
		title: String,
	},
	methods: {
		redirectToCollectionPage(collectionId: string) {
			this.$router.push({ name: 'CollectionPage', params: { id: collectionId } });
		},
	},
});
</script>

<style lang="scss" module>
.card {
	min-width: 240px;
	width: 100%;
	height: 140px;
	border-radius: var(--border-radius-large);
	border: $--version-card-border;
	margin-right: var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	padding: var(--spacing-s);
	cursor: pointer;
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
