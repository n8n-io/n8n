<template>
	<el-dialog
		:visible="!!node"
		:before-close="close"
		custom-class="data-display-wrapper"
		width="85%"
		append-to-body
		@opened="showDocumentHelp = true"
	>
		<div class="data-display" v-if="node" >
			<NodeSettings @valueChanged="valueChanged" />
			<RunData />

		</div>
	</el-dialog>
</template>

<script lang="ts">
import {
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	INodeUi,
	IUpdateInformation,
} from '../Interface';

import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import NodeSettings from '@/components/NodeSettings.vue';
import RunData from '@/components/RunData.vue';

import mixins from 'vue-typed-mixins';

export default mixins(externalHooks, nodeHelpers, workflowHelpers).extend({
	name: 'DataDisplay',
	components: {
		NodeSettings,
		RunData,
	},
	data () {
		return {
			basePath: this.$store.getters.getBaseUrl,
			showDocumentHelp: false,
		};
	},
	computed: {
		node (): INodeUi {
			return this.$store.getters.activeNode;
		},
		nodeType (): INodeTypeDescription | null {
			if (this.node) {
				return this.$store.getters.nodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
	},
	watch: {
		node (node, oldNode) {
			if(node && !oldNode) {
				this.$externalHooks().run('dataDisplay.nodeTypeChanged', { nodeSubtitle: this.getNodeSubtitle(node, this.nodeType, this.getWorkflow()) });
				this.$telemetry.track('User opened node modal', { node_type: this.nodeType ? this.nodeType.name : '', workflow_id: this.$store.getters.workflowId });
			}
			if (window.top) {
				window.top.postMessage(JSON.stringify({command: (node? 'openNDV': 'closeNDV')}), '*');
			}
		},
	},
	methods: {
		valueChanged (parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		close () {
			this.$externalHooks().run('dataDisplay.nodeEditingFinished');
			this.showDocumentHelp = false;
			this.$store.commit('setActiveNode', null);
		},
	},
});

</script>

<style lang="scss">
.data-display-wrapper {
	height: 85%;

	.el-dialog__header {
		padding: 0 !important;
	}

	.el-dialog__body {
		padding: 0 !important;
		height: 100%;
		min-height: 400px;
		overflow: hidden;
		border-radius: 8px;
	}
}

.data-display {
	background-color: #fff;
	border-radius: 8px;
	display: flex;
	height: 100%;
}

.fade-enter-active, .fade-enter-to, .fade-leave-active {
	transition: all .75s ease;
	opacity: 1;
}

.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
	opacity: 0;
}
</style>
