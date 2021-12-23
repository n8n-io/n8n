<template>
	<div class="template-details">
		<template-block title="Apps in this workflow">
			<template v-slot:content>
				<div :class="$style.icons">
					<NodeIcon
						v-for="node in template.nodes"
						:key="node.name"
						:nodeType="node"
						:title="node.name"
					/>
				</div>
			</template>
		</template-block>

		<template-block title="Categories">
			<template v-slot:content>
				<n8n-tags :tags="template.categories" />
			</template>
		</template-block>

		<template-block title="Details">
			<template v-slot:content>
				<div :class="$style.text">
					<n8n-text v-if="template.user" size="small" color="text-base">
						Created
						<TimeAgo :date="template.createdAt" />
						by
						{{ template.user.username }}
					</n8n-text>
				</div>
				<div :class="$style.text">
					<n8n-text size="small" color="text-base">
						Viewed
						{{ numberFormater(template.totalViews) }}
						times
					</n8n-text>
				</div>
			</template>
		</template-block>
	</div>
</template>
<script lang="ts">
import Vue from 'vue';
import TemplateBlock from './TemplateBlock/TemplateBlock.vue';
import NodeIcon from '../../components/NodeIcon.vue';

export default Vue.extend({
	props: {
		template: {
			type: Object,
		},
	},
	components: {
		NodeIcon,
		TemplateBlock,
	},
	methods: {
		numberFormater(num: number) {
			return Math.abs(num) > 999
				? Math.sign(num) * Number((Math.abs(num) / 1000).toFixed(1)) + 'k'
				: Math.sign(num) * Math.abs(num);
		},
	},
});
</script>
<style lang="scss" module>
.icons {
	display: flex;
}

.tags {
	display: flex;
}

.text {
	padding-bottom: 8px;
}
</style>
