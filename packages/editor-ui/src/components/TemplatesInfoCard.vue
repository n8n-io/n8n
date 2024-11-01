<script lang="ts" setup>
import Card from '@/components/CollectionWorkflowCard.vue';
import NodeList from '@/components/NodeList.vue';
import type { ITemplatesCollection } from '@/Interface';

withDefaults(
	defineProps<{
		collection: ITemplatesCollection;
		loading?: boolean;
		showItemCount?: boolean;
		width: string;
	}>(),
	{
		loading: false,
		showItemCount: true,
	},
);
</script>

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

<style lang="scss" module></style>
