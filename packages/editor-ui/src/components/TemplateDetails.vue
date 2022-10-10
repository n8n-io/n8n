<template>
	<div>
		<n8n-loading :loading="loading" :rows="5" variant="p" />

		<template-details-block v-if="!loading && template.nodes.length > 0" :title="blockTitle">
			<div :class="$style.icons">
				<div
					v-for="node in filterTemplateNodes(template.nodes)"
					:key="node.name"
					:class="$style.icon"
				>
					<NodeIcon
						:nodeType="node"
						:size="24"
						:showTooltip="true"
						@click="redirectToSearchPage(node)"
					/>
				</div>
			</div>
		</template-details-block>

		<template-details-block
			v-if="!loading && template.categories.length > 0"
			:title="$locale.baseText('template.details.categories')"
		>
			<n8n-tags :tags="template.categories" @click="redirectToCategory" />
		</template-details-block>

		<template-details-block v-if="!loading" :title="$locale.baseText('template.details.details')">
			<div :class="$style.text">
				<n8n-text size="small" color="text-base">
					{{ $locale.baseText('template.details.created') }}
					<TimeAgo :date="template.createdAt" />
					<span>{{ $locale.baseText('template.details.by') }}</span>
					<span v-if="template.user"> {{ template.user.username }}</span>
					<span v-else> n8n team</span>
				</n8n-text>
			</div>
			<div :class="$style.text">
				<n8n-text v-if="template.totalViews !== 0" size="small" color="text-base">
					{{ $locale.baseText('template.details.viewed') }}
					{{ abbreviateNumber(template.totalViews) }}
					{{ $locale.baseText('template.details.times') }}
				</n8n-text>
			</div>
		</template-details-block>
	</div>
</template>
<script lang="ts">
import Vue, { PropType } from 'vue';
import TemplateDetailsBlock from '@/components/TemplateDetailsBlock.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { abbreviateNumber, filterTemplateNodes } from '@/components/helpers';
import { ITemplatesNode, ITemplatesWorkflow, ITemplatesWorkflowFull } from '@/Interface';
export default Vue.extend({
	name: 'TemplateDetails',
	props: {
		blockTitle: {
			type: String,
		},
		loading: {
			type: Boolean,
		},
		template: {
			type: Object as PropType<ITemplatesWorkflow | ITemplatesWorkflowFull>,
		},
	},
	components: {
		NodeIcon,
		TemplateDetailsBlock,
	},
	methods: {
		abbreviateNumber,
		filterTemplateNodes,
		redirectToCategory(id: string) {
			this.$store.commit('templates/resetSessionId');
			this.$router.push(`/templates?categories=${id}`);
		},
		redirectToSearchPage(node: ITemplatesNode) {
			this.$store.commit('templates/resetSessionId');
			this.$router.push(`/templates?search=${node.displayName}`);
		},
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
