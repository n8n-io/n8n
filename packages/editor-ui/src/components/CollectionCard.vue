<template>
	<Card
		:loading="loading"
		:title="collection.name"
		@click="onClick"
	>
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
import { genericHelpers } from '@/mixins/genericHelpers';
import Card from '@/components/CollectionWorkflowCard.vue';
import mixins from 'vue-typed-mixins';
import NodeList from '@/components/NodeList.vue';

export default mixins(genericHelpers).extend({
	name: 'CollectionCard',
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

<style lang="scss" module>

</style>
