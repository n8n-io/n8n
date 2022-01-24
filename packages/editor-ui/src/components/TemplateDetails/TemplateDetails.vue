<template>
	<div class="template-details">
		<n8n-loading :animated="true" :loading="loading" :rows="5" variant="p" />

		<template-block v-if="!loading" :title="$locale.baseText('template.details.appsInTheWorkflow')">
			<template v-slot:content>
				<div :class="$style.icons">
					<NodeIcon
						v-for="node in template.nodes"
						:key="node.name"
						:nodeType="node"
						:title="node.name"
						:clickButton="redirectToSearchPage"
					/>
				</div>
			</template>
		</template-block>

		<template-block v-if="!loading" :title="$locale.baseText('template.details.categories')">
			<template v-slot:content>
				<n8n-tags :tags="template.categories" :clickButton="redirectToCategory"/>
			</template>
		</template-block>

		<template-block v-if="!loading" :title="$locale.baseText('template.details.details')">
			<template v-slot:content>
				<div :class="$style.text">
					<n8n-text v-if="template.user" size="small" color="text-base">
						{{ $locale.baseText('template.details.created') }}
						<TimeAgo :date="template.createdAt" />
						{{ $locale.baseText('template.details.by') }}
						{{ template.user.username }}
					</n8n-text>
				</div>
				<div :class="$style.text">
					<n8n-text size="small" color="text-base">
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

import TemplateBlock from './TemplateBlock/TemplateBlock.vue';
import NodeIcon from './NodeIcon/NodeIcon.vue';
import { abbreviateNumber } from '../helpers';

interface ITag {
	id: string;
	name: string;
}

interface INode {
	displayName: string;
}

export default Vue.extend({
	props: {
		loading: {
			type: Boolean,
		},
		template: {
			type: Object,
		},
	},
	components: {
		TemplateBlock,
		NodeIcon,
	},
	methods: {
		abbreviateNumber,
		redirectToCategory(tag: ITag) {
			this.$router.push(`/templates?categoryId=${tag.id}`);
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

.tags {
	display: flex;
}

.text {
	padding-bottom: var(--spacing-xs);
}
</style>
