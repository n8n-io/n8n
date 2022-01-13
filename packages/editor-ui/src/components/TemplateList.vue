<template>
	<div id="infiniteList"  :class="$style.listContainer">
		<n8n-heading size="large">Workflows</n8n-heading>
		<div :class="$style.templateList">
			<div v-for="workflow in workflowsUI" :key="workflow.id">
				<TemplateCard :title="workflow.name">
					<template v-slot:footer>
						<div>
							<n8n-text size="small" color="text-light">
								<font-awesome-icon icon="eye"></font-awesome-icon>
								{{workflow.totalViews}}
							</n8n-text>
							<n8n-text size="small" color="text-light">|</n8n-text>
							<n8n-text size="small" color="text-light">{{workflow.created_at}}</n8n-text>
							<n8n-text size="small" color="text-light">|</n8n-text>
							<n8n-text size="small" color="text-light">By {{workflow.user.username}}</n8n-text>
						</div>

						<NodeList :nodes=workflow.nodes :showMore="true"/>
					</template>
				</TemplateCard>
			</div>

		</div>

	</div>
</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import TemplateCard from '@/components/TemplateCard.vue';
import NodeList from '@/components/NodeList.vue';

export default mixins(
	genericHelpers,
).extend({
	name: 'TemplateList',
	components: {
		TemplateCard,
		NodeList,
	},
	data() {
		return {
			workflowsUI: [],
		};
	},
	computed: {
		workflows() {
			return this.$store.getters['templates/getWorkflows'];
		},
	},
	watch: {
		workflows(newWorkflows) {
			this.workflowsUI = newWorkflows;
		},
	},
	methods: {

	},
});
</script>

<style lang="scss" module>

.listContainer {
	// recalc with vars
	height: 450px;
	padding-top: 20px;
	overflow-y: scroll;

	.templateList {
		border-radius: var(--border-radius-large);
		border: 1px solid #DBDFE7;
		background-color: #FFFFFF;
		overflow: auto;
		height: auto;

		span {
			margin-left: 5px;
		}
	}
}


</style>
