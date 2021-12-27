<template>
	<div class="template-details">
		<template-block :title="$locale.baseText('template.details.appsInTheWorkflow')">
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

		<template-block :title="$locale.baseText('template.details.categories')">
			<template v-slot:content>
				<n8n-tags :tags="template.categories" />
			</template>
		</template-block>

		<template-block :title="$locale.baseText('template.details.details')">
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
import NodeIcon from '../../components/NodeIcon.vue';
import { abbreviateNumber } from '../helpers';

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
		abbreviateNumber,
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
	padding-bottom: var(--spacing-2xs);
}
</style>
