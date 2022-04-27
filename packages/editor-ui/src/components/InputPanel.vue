<template>
	<RunData
		:nodeUi="currentNode"
		:runIndex="runIndex"
		:overrideOutputIndex="overrideOutputIndex"
		:linkedRuns="linkedRuns"
		@linkRun="onLinkRun"
		@unlinkRun="onUnlinkRun"
		@openSettings="openSettings"
		@runChange="onRunIndexChange">
		<template name="header">
			<div :class="$style.titleSection">
				<n8n-select size="small" :value="immediate ? IMMEDIATE_INPUT_KEY : currentNodeName" @input="onSelect">
					<template slot="prepend">
						<span :class="$style.title">{{ $locale.baseText('ndv.input') }}</span>
					</template>
					<n8n-option :label="$locale.baseText('ndv.input.immediate')" :value="IMMEDIATE_INPUT_KEY" :key="IMMEDIATE_INPUT_KEY"></n8n-option>
					<n8n-option v-for="node in parentNodes" :label="node.name" :value="node.name" :key="node.name"></n8n-option>
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

const IMMEDIATE_INPUT_KEY = '__IMMEDIATE_INPUT__';

export default mixins(
	workflowHelpers,
).extend({
	name: 'InputPanel',
	components: { RunData },
	props: {
		currentNodeName: {
			type: String,
		},
		runIndex: {
			type: Number,
		},
		linkedRuns: {
			type: Boolean,
		},
		workflow: {
		},
		immediate: {
			type: Boolean,
		},
	},
	data() {
		return {
			IMMEDIATE_INPUT_KEY,
		};
	},
	computed: {
		currentWorkflow(): Workflow {
			return this.workflow as Workflow;
		},
		activeNode (): INodeUi | null {
			return this.$store.getters.activeNode;
		},
		currentNode (): INodeUi {
			return this.$store.getters.getNodeByName(this.currentNodeName);
		},
		parentNodeOutputIndex (): number | undefined {
			if (!this.currentNode || !this.activeNode) {
				return undefined;
			}
			return this.currentWorkflow.getNodeConnectionOutputIndex(this.activeNode.name, this.currentNodeName, 'main', 1);
		},
		overrideOutputIndex (): number | undefined {
			return this.immediate ? this.parentNodeOutputIndex : undefined;
		},
		parentNodes (): INodeUi[] {
			if (!this.activeNode) {
				return [];
			}
			const nodes: INodeUi[] = (this.workflow as Workflow).getParentNodes(this.activeNode.name)
				.map((nodeName: string) => this.$store.getters.getNodeByName(nodeName));
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
		onLinkRun() {
			this.$emit('linkRun');
		},
		onUnlinkRun() {
			this.$emit('unlinkRun');
		},
		onSelect(value: string) {
			this.$emit('select', value === IMMEDIATE_INPUT_KEY ? undefined : value);
		},
	},
});
</script>

<style lang="scss" module>
.titleSection {
	display: flex;
	max-width: 200px;

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
