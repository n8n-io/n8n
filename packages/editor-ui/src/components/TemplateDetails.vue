<template>
	<div>
		<n8n-loading :loading="loading" :rows="5" variant="p" />

		<TemplateDetailsBlock
			v-if="!loading && template && template.nodes.length > 0"
			:title="blockTitle"
		>
			<div :class="$style.icons">
				<div
					v-for="node in filterTemplateNodes(template.nodes)"
					:key="node.name"
					:class="$style.icon"
				>
					<NodeIcon
						:node-type="node"
						:size="24"
						:show-tooltip="true"
						@click="redirectToSearchPage(node)"
					/>
				</div>
			</div>
		</TemplateDetailsBlock>

		<TemplateDetailsBlock
			v-if="!loading && isFullTemplatesCollection(template) && template.categories.length > 0"
			:title="$locale.baseText('template.details.categories')"
		>
			<n8n-tags :tags="template.categories" @click:tag="redirectToCategory" />
		</TemplateDetailsBlock>

		<TemplateDetailsBlock
			v-if="!loading && template"
			:title="$locale.baseText('template.details.details')"
		>
			<div :class="$style.text">
				<n8n-text v-if="isTemplatesWorkflow(template)" size="small" color="text-base">
					{{ $locale.baseText('template.details.created') }}
					<TimeAgo :date="template.createdAt" />
					{{ $locale.baseText('template.details.by') }}
					{{ template.user ? template.user.username : 'n8n team' }}
				</n8n-text>
			</div>
			<div :class="$style.text">
				<n8n-text
					v-if="isTemplatesWorkflow(template) && template.totalViews !== 0"
					size="small"
					color="text-base"
				>
					{{ $locale.baseText('template.details.viewed') }}
					{{ abbreviateNumber(template.totalViews) }}
					{{ $locale.baseText('template.details.times') }}
				</n8n-text>
			</div>
		</TemplateDetailsBlock>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import TemplateDetailsBlock from '@/components/TemplateDetailsBlock.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { filterTemplateNodes } from '@/utils/nodeTypesUtils';
import { abbreviateNumber } from '@/utils/typesUtils';
import type {
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesNode,
	ITemplatesWorkflow,
} from '@/Interface';
import { mapStores } from 'pinia';
import { useTemplatesStore } from '@/stores/templates.store';
import TimeAgo from '@/components/TimeAgo.vue';
import { isFullTemplatesCollection, isTemplatesWorkflow } from '@/utils/templates/typeGuards';

export default defineComponent({
	name: 'TemplateDetails',
	components: {
		NodeIcon,
		TemplateDetailsBlock,
		TimeAgo,
	},
	props: {
		template: {
			type: Object as PropType<
				ITemplatesWorkflow | ITemplatesCollection | ITemplatesCollectionFull | null
			>,
			required: true,
		},
		blockTitle: {
			type: String,
			required: true,
		},
		loading: {
			type: Boolean,
		},
	},
	computed: {
		...mapStores(useTemplatesStore),
	},
	methods: {
		abbreviateNumber,
		filterTemplateNodes,
		redirectToCategory(id: string) {
			this.templatesStore.resetSessionId();
			void this.$router.push(`/templates?categories=${id}`);
		},
		redirectToSearchPage(node: ITemplatesNode) {
			this.templatesStore.resetSessionId();
			void this.$router.push(`/templates?search=${node.displayName}`);
		},
		isFullTemplatesCollection,
		isTemplatesWorkflow,
	},
});
</script>
<style lang="scss" module>
.icons {
	display: flex;
	flex-wrap: wrap;
}
.icon {
	margin-right: var(--spacing-xs);
	margin-bottom: var(--spacing-xs);
	cursor: pointer;
}
.text {
	padding-bottom: var(--spacing-xs);
}
</style>
