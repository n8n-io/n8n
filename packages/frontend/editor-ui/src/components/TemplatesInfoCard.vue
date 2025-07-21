<script lang="ts" setup>
import Card from '@/components/CollectionWorkflowCard.vue';
import NodeList from '@/components/NodeList.vue';
import { useI18n } from '@n8n/i18n';
import type { ITemplatesCollection } from '@n8n/rest-api-client/api/templates';

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

const i18n = useI18n();
</script>

<template>
	<Card :loading="loading" :title="collection.name" :style="{ width }">
		<template #footer>
			<span>
				<n8n-text v-show="showItemCount" size="small" color="text-light">
					{{ collection.workflows.length }}
					{{ i18n.baseText('templates.workflows') }}
				</n8n-text>
			</span>
			<NodeList :nodes="collection.nodes" :show-more="false" />
		</template>
	</Card>
</template>

<style lang="scss" module></style>
