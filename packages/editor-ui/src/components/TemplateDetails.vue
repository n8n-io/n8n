<template>
	<div class="template-details">
		<n8n-loading :animated="true" :loading="loading" :rows="5" variant="p" />

		<template-block
			v-if="!loading && template.nodes.length > 0"
			:title="blockTitle"
		>
			<template v-slot:content>
				<div :class="$style.icons">
					<div
						v-for="node in filterCoreNodes(template.nodes)"
						:key="node.name"
						:class="$style.icon"
					>
						<TemplateNodeIcon
							:nodeType="node"
							:title="node.name"
							:clickButton="redirectToSearchPage"
							:size="24"
						/>
					</div>
				</div>
			</template>
		</template-block>

		<template-block
			v-if="!loading && template.categories.length > 0"
			:title="$locale.baseText('template.details.categories')"
		>
			<template v-slot:content>
				<n8n-tags :tags="template.categories" :clickButton="redirectToCategory" />
			</template>
		</template-block>

		<template-block v-if="!loading" :title="$locale.baseText('template.details.details')">
			<template v-slot:content>
				<div :class="$style.text">
					<n8n-text size="small" color="text-base">
						{{ $locale.baseText('template.details.created') }}
						<TimeAgo :date="template.created_at" />
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
			</template>
		</template-block>
	</div>
</template>
<script lang="ts">
import Vue from 'vue';

import TemplateBlock from '@/components/TemplateBlock.vue';
import TemplateNodeIcon from '@/components/TemplateNodeIcon.vue';

import { abbreviateNumber } from '@/components/helpers';
import { ITemplateCategories } from '@/Interface';
import { TEMPLATES_NODES_FILTER } from '@/constants';

interface INode {
	displayName: string;
	defaults: {
		color: string;
	};
	categories: ITemplateCategories[];
	icon: string;
	iconData?: {
		fileBuffer?: string;
		type?: string;
	};
	name: string;
	typeVersion: number;
}

interface ITag {
	id: string;
	name: string;
}

interface INode {
	displayName: string;
}

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
			type: Object,
		},
	},
	components: {
		TemplateBlock,
		TemplateNodeIcon,
	},
	methods: {
		abbreviateNumber,
		filterCoreNodes(nodes: []) {
			const notCoreNodes = nodes.filter((elem) => {
				const node = elem as INode;
				if (node.categories) {
					const found = node.categories.some(
						(category: ITemplateCategories) => category.name === 'Core Nodes',
					);
					if (!found) return !TEMPLATES_NODES_FILTER.includes(node.name);
					else return;
				} else {
					return;
				}
			});
			return notCoreNodes.length > 0
				? notCoreNodes
				: nodes.filter((elem: INode) => !TEMPLATES_NODES_FILTER.includes(elem.name));
		},
		redirectToCategory(tag: ITag) {
			this.$router.push(`/templates?categories=${tag.id}`);
		},
		redirectToSearchPage(node: INode) {
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
}

.tags {
	display: flex;
}

.text {
	padding-bottom: var(--spacing-xs);
}
</style>
