<template>
	<div>
		<div :class="$style.content">
			<div :class="$style.markdown">
				<n8n-markdown :content="collection.description" :images="collection.image" :loading="loading" />
				<template-list :loading="loading" :workflows="collection.workflows"/>
			</div>
			<div :class="$style.details">
				<template-details :loading="loading" :template="collection" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import TemplateDetails from '@/components/Templates/WorkflowPage/TemplateDetails/TemplateDetails.vue';
import TemplateList from '@/components/Templates/CollectionPage/TemplateList.vue';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { IN8nCollection } from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	components: {
		TemplateDetails,
		TemplateList,
	},
	computed: {
		collection(): IN8nCollection {
			return this.$store.getters['templates/getCollection'];
		},
	},
	data() {
		return {
			loading: true,
		};
	},
	async mounted() {
		const collectionId = this.$route.params.id;
		const response = await this.$store.dispatch('templates/getCollectionById', collectionId);
		if (!response) {
			this.$showMessage({
				title: 'Error',
				message: 'Could not find collection',
				type: 'error',
			});
		}
		this.loading = false;
	},
});
</script>
<style lang="scss" module>
.image {
	width: 100%;

	img {
		width: 100%;
	}
}

.content {
	display: flex;
	justify-content: space-between;
}

.markdown {
	width: 100%;
	padding-right: var(--spacing-2xl);
}

.spacer {
	margin: 56px;
}

.details {
	width: 180px;

	@media (max-width: $--breakpoint-xs) {
		width: auto;
	}
}
</style>
