<template>
	<Card :loading="loading" :title="collection.name" :style="{ width }">
		<template #footer>
			<span>
				<n8n-text v-show="showItemCount" size="small" color="text-light">
					{{ collection.workflows.length }}
					{{ $locale.baseText('templates.workflows') }}
				</n8n-text>
			</span>
			<NodeList :nodes="collection.nodes" :show-more="false" />
		</template>
	</Card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Card from '@/components/CollectionWorkflowCard.vue';
import NodeList from '@/components/NodeList.vue';

export default defineComponent({
	name: 'TemplatesInfoCard',
	components: {
		Card,
		NodeList,
	},
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
		width: {
			type: String,
			required: true,
		},
	},
});
</script>

<style lang="scss" module></style>
