<template>
	<RunData
		:nodeUi="node"
		:runIndex="runIndex"
		:overrideOutputIndex="overrideOutputIndex"
		@openSettings="openSettings"
		@runChange="onRunIndexChange">
		<template name="header">
			<div :class="$style.titleSection">
				<n8n-select size="small" v-model="selectedNode">
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
		activeNode (): INodeUi | null {
			return this.$store.getters.activeNode;
		},
		workflow (): Workflow {
			return this.getWorkflow();
		},
		parentNode (): string | undefined {
			if (!this.activeNode) {
				return undefined;
			}

			return this.workflow.getParentNodes(this.activeNode.name, 'main', 1)[0];
		},
		parentNodeOutputIndex (): number | undefined {
			if (!this.parentNode || !this.activeNode) {
				return undefined;
			}
			return this.workflow.getNodeConnectionOutputIndex(this.activeNode.name, this.parentNode, 'main', 1);
		},
		node (): INodeUi | null {
			if (this.selectedNode === IMMEDIATE_KEY) {
				if (this.parentNode) {
					return this.$store.getters.getNodeByName(this.parentNode);
				}

				return null;
			}

			return this.$store.getters.getNodeByName(this.selectedNode);
		},
		overrideOutputIndex (): number | undefined {
			return this.selectedNode === IMMEDIATE_KEY ? this.parentNodeOutputIndex : undefined;
		},
		workflowNodes (): INodeUi[] {
			if (!this.activeNode) {
				return [];
			}
			const nodes: INodeUi[] = this.$store.getters.allNodes;
			return nodes.filter((node) => this.activeNode && (node.name !== this.activeNode.name));
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
