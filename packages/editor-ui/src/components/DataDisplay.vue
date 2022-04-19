<template>
	<el-dialog
		:visible="!!node || renaming"
		:before-close="close"
		:show-close="false"
		custom-class="data-display-wrapper"
		width="85%"
		append-to-body
	>
		<n8n-tooltip placement="bottom-start" :value="showTriggerWaitingWarning" :disabled="!showTriggerWaitingWarning" :manual="true">
			<div slot="content" :class="$style.triggerWarning">{{ $locale.baseText('ndv.backToCanvas.waitingForTriggerWarning') }}</div>
			<div :class="$style.backToCanvas" @click="close">
				<n8n-icon icon="arrow-left" color="text-xlight" size="medium" />
				<n8n-text color="text-xlight" size="medium" :bold="true">{{ $locale.baseText('ndv.backToCanvas') }}</n8n-text>
			</div>
		</n8n-tooltip>

		<div class="data-display" v-if="node" >
			<NodeSettings :eventBus="settingsEventBus" @valueChanged="valueChanged" @execute="onNodeExecute" />
			<RunData @openSettings="openSettings" />
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
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default mixins(externalHooks, nodeHelpers, workflowHelpers).extend({
	name: 'DataDisplay',
	components: {
		NodeSettings,
		RunData,
	},
	props: {
		renaming: {
			type: Boolean,
		},
	},
	data () {
		return {
			settingsEventBus: new Vue(),
			triggerWaitingWarningEnabled: false,
		};
	},
	computed: {
		...mapGetters(['executionWaitingForWebhook']),
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
		showTriggerWaitingWarning(): boolean {
			return this.triggerWaitingWarningEnabled && !!this.nodeType && !this.nodeType.group.includes('trigger') && this.workflowRunning && this.executionWaitingForWebhook;
		},
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
				this.triggerWaitingWarningEnabled = false;
				this.$externalHooks().run('dataDisplay.nodeTypeChanged', { nodeSubtitle: this.getNodeSubtitle(node, this.nodeType, this.getWorkflow()) });
				this.$telemetry.track('User opened node modal', { node_type: this.nodeType ? this.nodeType.name : '', workflow_id: this.$store.getters.workflowId });
			}
			if (window.top) {
				window.top.postMessage(JSON.stringify({command: (node? 'openNDV': 'closeNDV')}), '*');
			}
		},
	},
	methods: {
		onNodeExecute() {
			setTimeout(() => {
				if (!this.node || !this.workflowRunning) {
					return;
				}
				this.triggerWaitingWarningEnabled = true;
			}, 1000);
		},
		openSettings() {
			this.settingsEventBus.$emit('openSettings');
		},
		valueChanged (parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		close () {
			this.$externalHooks().run('dataDisplay.nodeEditingFinished');
			this.triggerWaitingWarningEnabled = false;
			this.$store.commit('setActiveNode', null);
		},
	},
});

</script>

<style lang="scss">
.data-display-wrapper {
	height: 85%;
	margin-top: 48px !important;

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

<style lang="scss" module>
.triggerWarning {
	max-width: 180px;
}

.backToCanvas {
	position: absolute;
	top: -40px;

	&:hover {
		cursor: pointer;
	}

	> * {
		margin-right: var(--spacing-3xs);
	}
}

@media (min-width: $--breakpoint-lg) {
	.backToCanvas {
		position: fixed;
		top: 10px;
		left: 20px;
	}
}
</style>
