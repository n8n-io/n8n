<template>
	<Card :loading="loading" :title="collection.name">
		<template #footer>
			<span>
				<n8n-text v-show="showItemCount" size="small" color="text-light">
					{{ collection.workflows.length }}
					{{ $locale.baseText('templates.workflows') }}
				</n8n-text>
			</span>
			<NodeList :nodes="collection.nodes" :showMore="false" />
		</template>
	</Card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { genericHelpers } from '@/mixins/genericHelpers';
import Card from '@/components/CollectionWorkflowCard.vue';
import NodeList from '@/components/NodeList.vue';

export default defineComponent({
	name: 'TemplatesInfoCard',
	mixins: [genericHelpers],
	props: {
		loading: {
			type: Boolean,
		},
		collection: {
			type: Object,
		},
		showItemCount: {
			type: Boolean,
			default: true,
		},
	},
	components: {
		Card,
		NodeList,
	},
});
</script>

<style lang="scss" module></style>
