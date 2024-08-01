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
import { type PropType, defineComponent } from 'vue';
import Card from '@/components/CollectionWorkflowCard.vue';
import NodeList from '@/components/NodeList.vue';
import type { ITemplatesCollection } from '@/Interface';

export default defineComponent({
	name: 'TemplatesInfoCard',
	components: {
		Card,
		NodeList,
	},
	props: {
		collection: {
			type: Object as PropType<ITemplatesCollection>,
			required: true,
		},
		loading: {
			type: Boolean,
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
