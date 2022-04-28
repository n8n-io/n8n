<template>
	<RunData
		:nodeUi="currentNode"
		:runIndex="runIndex"
		:overrideOutputIndex="overrideOutputIndex"
		:linkedRuns="linkedRuns"
		:canLinkRuns="canLinkRuns"
		:emptyOutputMessage="$locale.baseText('ndv.input.emptyOutput')"
		:emptyOutputHint="$locale.baseText('ndv.input.emptyOutput.hint', { interpolate: { nodeName: activeNode.name } })"
		:tooMuchDataTitle="$locale.baseText('ndv.input.tooMuchData.title')"
		:noDataInBranchMessage="$locale.baseText('ndv.input.noOutputDataInBranch')"
		:isExecuting="isExecutingPrevious"
		:executingMessage="$locale.baseText('ndv.input.executingPrevious')"
		@linkRun="onLinkRun"
		@unlinkRun="onUnlinkRun"
		@runChange="onRunIndexChange">
		<template v-slot:header>
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

		<template v-slot:node-not-run>
			<div :class="$style.noOutputData" v-if="immediateNodeName">
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{ $locale.baseText('ndv.input.noOutputData.title') }}</n8n-text>
				<NodeExecuteButton type="outline" :nodeName="immediateNodeName" :label="$locale.baseText('ndv.input.noOutputData.executePrevious')" @execute="onNodeExecute" />
				<n8n-text size="small">
					{{ $locale.baseText('ndv.input.noOutputData.hint') }}
				</n8n-text>
			</div>
			<div :class="$style.notConnected" v-else>
				<div>
					<WireMeUp />
				</div>
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{ $locale.baseText('ndv.input.notConnected.title') }}</n8n-text>
				<n8n-text tag="div">{{ $locale.baseText('ndv.input.notConnected.message') }}</n8n-text>
			</div>
		</template>

		<template v-slot:no-output-data>
			<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{ $locale.baseText('ndv.input.noOutputData') }}</n8n-text>
			<n8n-text tag="div">{{ $locale.baseText('ndv.input.noOutputDataInNode') }}</n8n-text>
		</template>
	</RunData>
</template>

<script lang="ts">
import { INodeUi } from '@/Interface';
import { Workflow } from 'n8n-workflow';
import RunData from './RunData.vue';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';
import NodeExecuteButton from './NodeExecuteButton.vue';
import WireMeUp from './WireMeUp.vue';

const IMMEDIATE_INPUT_KEY = '__IMMEDIATE_INPUT__';

export default mixins(
	workflowHelpers,
).extend({
	name: 'InputPanel',
	components: { RunData, NodeExecuteButton, WireMeUp },
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
		immediateNodeName: {
			type: String,
		},
		immediate: {
			type: Boolean,
		},
		canLinkRuns: {
			type: Boolean,
		},
	},
	data() {
		return {
			IMMEDIATE_INPUT_KEY,
		};
	},
	computed: {
		isExecutingPrevious(): boolean {
			const executingNode = this.$store.getters.executingNode;
			if (executingNode) {
				return !!this.parentNodes.find((node) => node.name === executingNode);
			}
			return false;
		},
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
		onNodeExecute() {
			this.$emit('execute');
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

.noOutputData {
	max-width: 180px;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.notConnected {
	max-width: 300px;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 3px;
	font-weight: var(--font-weight-bold);
}

</style>
