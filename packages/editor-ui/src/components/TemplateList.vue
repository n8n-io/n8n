<template>
	<div :class="$style.listWrapper">
		<n8n-heading size="large">Workflows ({{workflowsUI.length}})</n8n-heading>
		<div v-if="workflowsUI.length" id="infiniteList" :class="$style.listContainer">
			<div :class="$style.templateList">
				<div v-for="workflow in workflowsUI" :key="workflow.id">
					<TemplateCard :title="workflow.name">

					<template v-slot:right>
						<div :class="$style.nodesContainer">
							<NodeList :nodes=workflow.nodes :showMore="true"/>
						</div>
					</template>

					<template v-slot:rightHover>
						<n8n-button type="outline" label="Use workflow"></n8n-button>
					</template>

					<template v-slot:footer>
						<div>
							<span v-if="workflow.totalViews">
								<n8n-text size="small" color="text-light">
									<font-awesome-icon icon="eye"></font-awesome-icon>
									{{truncate(workflow.totalViews)}}
								</n8n-text>
								<n8n-text size="small" color="text-light">|</n8n-text>
							</span>
							<n8n-text size="small" color="text-light">
								<TimeAgo :date="workflow.created_at" />
							</n8n-text>
							<n8n-text size="small" color="text-light">|</n8n-text>
							<n8n-text size="small" color="text-light">By {{workflow.user.username}}</n8n-text>
						</div>
					</template>
				</TemplateCard>

				</div>

			</div>

		</div>

		<div v-else class="emptyText">
			<n8n-text>No workflows found. Try adjusting your search to see more.</n8n-text>
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
			hover: false,
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
		truncate(views: number): string {
			return new Intl.NumberFormat('en-GB', {
				notation: "compact",
				compactDisplay: "short",
			}).format(views);
		},
	},
});
</script>

<style lang="scss" module>

.listWrapper {
	// recalc with vars
	// height: 450px;
	padding-top: 20px;

	.listContainer {
		position: absolute;
		// recalc with vars
		height: calc(100% - 450px);
		width: calc(100% - 340px);
		margin-top: 20px;
		overflow-y: scroll;

		.templateList {
			border-radius: var(--border-radius-large);
			border: 1px solid #DBDFE7;
			background-color: #FFFFFF;
			overflow: auto;
			height: auto;

			.nodesContainer {
				padding-top: 10px;
			}

			footer {
				>span {
					margin-right: 5px;
				}
			}
		}
	}

}


</style>
