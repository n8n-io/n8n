<template>
	<Card :loading="loading" :title="collection.name" @click="onClick">
		<template #footer>
			<n8n-text size="small" color="text-light">
				{{ collection.workflows.length }}
				{{ $locale.baseText('templates.workflows') }}
			</n8n-text>
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
	name: 'CollectionCard',
	mixins: [genericHelpers],
	props: {
		loading: {
			type: Boolean,
		},
		collection: {
			type: Object,
		},
	},
	components: {
		Card,
		NodeList,
	},
	methods: {
		onClick(e: MouseEvent) {
			this.$emit('click', e);
		},
	},
});
</script>

<style lang="scss" module></style>
