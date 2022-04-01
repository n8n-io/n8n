<template>
	<RunData :nodeUi="node" :runIndex="runIndex" @openSettings="openSettings" @runChange="onRunIndexChange">
		<template name="header">
			<div :class="$style.titleSection">
				<n8n-select size="small" v-model="selectedNode" @click.stop>
					<template slot="prepend">
						<span :class="$style.title">{{ $locale.baseText('node.input') }}</span>
					</template>
					<n8n-option :label="$locale.baseText('node.input.immediate')" :value="IMMEDIATE_KEY" :key="IMMEDIATE_KEY"></n8n-option>
					<n8n-option v-for="node in workflowNodes" :label="node.name" :value="node.name" :key="node.name"></n8n-option>
				</n8n-select>
			</div>
		</template>
	</RunData>
</template>

<script lang="ts">
import { INodeUi } from '@/Interface';
import { Workflow } from 'n8n-workflow';
import RunData from './RunData.vue';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

const IMMEDIATE_KEY = '__IMMEDIATE__';

export default mixins(
	workflowHelpers,
).extend({
	name: 'InputPanel',
	components: { RunData },
	props: {
		runIndex: {
			type: Number,
		},
	},
	data() {
		return {
			selectedNode: IMMEDIATE_KEY,
			IMMEDIATE_KEY,
		};
	},
	computed: {
		workflow (): Workflow {
			return this.getWorkflow();
		},
		parentNodes (): string[] {
			const activeNode = this.$store.getters.activeNode;
			if (activeNode === null) {
				return [];
			}

			return this.workflow.getParentNodes(activeNode.name, 'main', 1);
		},
		node (): INodeUi | null {
			if (this.selectedNode === IMMEDIATE_KEY) {
				return this.$store.getters.getNodeByName(this.parentNodes[0]);
			}

			return this.$store.getters.getNodeByName(this.selectedNode);
		},
		workflowNodes (): INodeUi[] {
			const activeNode = this.$store.getters.activeNode;
			const nodes: INodeUi[] = this.$store.getters.allNodes;
			return nodes.filter((node) => node.name !== activeNode.name);
		},
	},
	methods: {
		openSettings() {
			this.$emit('openSettings');
		},
		onRunIndexChange(run: number) {
			this.$emit('runChange', run);
		},
	},
});
</script>

<style lang="scss" module>
.titleSection {
	display: flex;

	> * {
		margin-right: var(--spacing-2xs);
	}
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 3px;
	font-weight: var(--font-weight-bold);
}
</style>
