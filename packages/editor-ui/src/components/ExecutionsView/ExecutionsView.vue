<template>
	<div :class="$style.container">
		<executions-sidebar @loaded="onExecutionsLoaded"/>
		<div :class="$style.content" v-if="!loading">
				<router-view name="executionPreview" />
		</div>
	</div>
</template>

<script lang="ts">
import ExecutionsSidebar from '@/components/ExecutionsView/ExecutionsSidebar.vue';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, WEBHOOK_NODE_TYPE } from '@/constants';
import { INodeUi, ITag, IWorkflowDb } from '@/Interface';
import { IConnection, IConnections, INodeIssues, INodeTypeDescription, INodeTypeNameVersion, NodeHelpers } from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { restApi } from '../mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import { v4 as uuid } from 'uuid';

export default mixins(restApi, showMessage).extend({
	name: 'executions-page',
	components: {
		ExecutionsSidebar,
	},
	data() {
		return {
			loading: true,
		};
	},
	computed: {
		workflowDataNotLoaded (): boolean {
			return this.$store.getters.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID && this.$store.getters.workflowName === '';
		},
	},
	async mounted() {
		if (this.workflowDataNotLoaded) {
			if (this.$store.getters['nodeTypes/allNodeTypes'].length === 0) {
				await this.$store.dispatch('nodeTypes/getNodeTypes');
			}
			await this.openWorkflow(this.$route.params.name);
			const executions = await await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions', { status: '' });
			this.$store.commit('workflows/setCurrentWorkflowExecutions', executions);
		}
	},
	methods: {
		onExecutionsLoaded(executionCount: number): void {
			this.loading = executionCount === 0;
		},
		async openWorkflow(workflowId: string): Promise<void> {
			let data: IWorkflowDb | undefined;
				try {
					data = await this.restApi().getWorkflow(workflowId);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.openWorkflow.title'),
					);
					return;
				}
				if (data === undefined) {
					throw new Error(
						this.$locale.baseText(
							'nodeView.workflowWithIdCouldNotBeFound',
							{ interpolate: { workflowId } },
						),
					);
				}
				await this.addNodes(data.nodes, data.connections);
				this.$store.commit('setActive', data.active || false);
				this.$store.commit('setWorkflowId', workflowId);
				this.$store.commit('setWorkflowName', { newName: data.name, setStateDirty: false });
				this.$store.commit('setWorkflowSettings', data.settings || {});
				this.$store.commit('setWorkflowPinData', data.pinData || {});
				const tags = (data.tags || []) as ITag[];
				this.$store.commit('tags/upsertTags', tags);
				const tagIds = tags.map((tag) => tag.id);
				this.$store.commit('setWorkflowTagIds', tagIds || []);

				this.$externalHooks().run('workflow.open', { workflowId, workflowName: data.name });
		},
		async addNodes(nodes: INodeUi[], connections?: IConnections) {
			if (!nodes || !nodes.length) {
				return;
			}

			await this.loadNodesProperties(nodes.map(node => ({ name: node.type, version: node.typeVersion })));

			let nodeType: INodeTypeDescription | null;
			nodes.forEach((node) => {
				if (!node.id) {
					node.id = uuid();
				}

				nodeType = this.$store.getters['nodeTypes/getNodeType'](node.type, node.typeVersion) as INodeTypeDescription | null;

				// Make sure that some properties always exist
				if (!node.hasOwnProperty('disabled')) {
					node.disabled = false;
				}

				if (!node.hasOwnProperty('parameters')) {
					node.parameters = {};
				}

				// Load the defaul parameter values because only values which differ
				// from the defaults get saved
				if (nodeType !== null) {
					let nodeParameters = null;
					try {
						nodeParameters = NodeHelpers.getNodeParameters(nodeType.properties, node.parameters, true, false, node);
					} catch (e) {
						console.error(this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') + `: "${node.name}"`); // eslint-disable-line no-console
						console.error(e); // eslint-disable-line no-console
					}
					node.parameters = nodeParameters !== null ? nodeParameters : {};

					// if it's a webhook and the path is empty set the UUID as the default path
					if (node.type === WEBHOOK_NODE_TYPE && node.parameters.path === '') {
						node.parameters.path = node.webhookId as string;
					}
				}

				this.$store.commit('addNode', node);
			});

			// Load the connections
			if (connections !== undefined) {
				let connectionData;
				for (const sourceNode of Object.keys(connections)) {
					for (const type of Object.keys(connections[sourceNode])) {
						for (let sourceIndex = 0; sourceIndex < connections[sourceNode][type].length; sourceIndex++) {
							const outwardConnections = connections[sourceNode][type][sourceIndex];
							if (!outwardConnections) {
								continue;
							}
							outwardConnections.forEach((
								targetData,
							) => {
								connectionData = [
									{
										node: sourceNode,
										type,
										index: sourceIndex,
									},
									{
										node: targetData.node,
										type: targetData.type,
										index: targetData.index,
									},
								] as [IConnection, IConnection];

								this.$store.commit('addConnection', { connection: connectionData, setStateDirty: false });
							});
						}
					}
				}
			}
		},
		async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
			const allNodes: INodeTypeDescription[] = this.$store.getters['nodeTypes/allNodeTypes'];

			const nodesToBeFetched: INodeTypeNameVersion[] = [];
			allNodes.forEach(node => {
				const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
				if (!!nodeInfos.find(n => n.name === node.name && nodeVersions.includes(n.version)) && !node.hasOwnProperty('properties')) {
					nodesToBeFetched.push({
						name: node.name,
						version: Array.isArray(node.version)
							? node.version.slice(-1)[0]
							: node.version,
					});
				}
			});

			if (nodesToBeFetched.length > 0) {
				// Only call API if node information is actually missing
				await this.$store.dispatch('nodeTypes/getNodesInformation', nodesToBeFetched);
			}
		},
		resetMainNodeView(): void {
			this.$store.commit('removeAllConnections', { setStateDirty: false });
			this.$store.commit('removeAllNodes', { setStateDirty: false, removePinData: true });
			this.$store.commit('setWorkflowExecutionData', null);
			this.$store.commit('resetAllNodesIssues');
			this.$store.commit('setActive', false);
			this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);
			this.$store.commit('setWorkflowName', { newName: '', setStateDirty: false });
			this.$store.commit('setWorkflowSettings', {});
			this.$store.commit('setWorkflowTagIds', []);
			this.$store.commit('setActiveExecutionId', null);
			this.$store.commit('setExecutingNode', null);
			this.$store.commit('removeActiveAction', 'workflowRunning');
			this.$store.commit('setExecutionWaitingForWebhook', false);
			this.$store.commit('resetSelectedNodes');
			this.$store.commit('setNodeViewOffsetPosition', { newOffset: [0, 0], setStateDirty: false });
		},
	},
});
</script>

<style module lang="scss">

.container {
	display: flex;
	height: 100%;
}

.content {
	flex: 1;
}

</style>
