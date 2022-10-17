<template>
	<div :class="$style.container">
		<executions-sidebar
			v-if="showSidebar"
			:executions="executions"
			:loading="loading"
			@reloadExecutions="setExecutions"
			@filterUpdated="onFilterUpdated"
			@refresh="loadAutoRefresh"
		/>
		<div :class="$style.content" v-if="!hidePreview">
			<router-view name="executionPreview" @deleteCurrentExecution="onDeleteCurrentExecution"/>
		</div>
	</div>
</template>

<script lang="ts">
import ExecutionsSidebar from '@/components/ExecutionsView/ExecutionsSidebar.vue';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS, WEBHOOK_NODE_TYPE } from '@/constants';
import { IExecutionsSummary, INodeUi, ITag, IWorkflowDb } from '@/Interface';
import { IConnection, IConnections, INodeTypeDescription, INodeTypeNameVersion, NodeHelpers } from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { restApi } from '../mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import { v4 as uuid } from 'uuid';
import { Route } from 'vue-router';
import { executionHelpers } from '../mixins/executionsHelpers';
import { range as _range } from 'lodash';

export default mixins(restApi, showMessage, executionHelpers).extend({
	name: 'executions-page',
	components: {
		ExecutionsSidebar,
	},
	data() {
		return {
			loading: false,
			filter: { finished: true, status: '' },
		};
	},
	computed: {
		hidePreview (): boolean {
			const nothingToShow = this.executions.length === 0 && this.filterApplied;
			const activeNotPresent = (this.executions as IExecutionsSummary[]).find(ex => ex.id === this.activeExecution.id) === undefined;
			return this.loading || nothingToShow || activeNotPresent;
		},
		showSidebar (): boolean {
			if (this.executions.length === 0) {
				return this.filterApplied;
			}
			return true;
		},
		filterApplied (): boolean {
			return this.filter.status !== '';
		},
		workflowDataNotLoaded (): boolean {
			return this.$store.getters.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID && this.$store.getters.workflowName === '';
		},
	},
	watch:{
    $route (to: Route, from: Route) {
			if (to.params.name !== from.params.name) {
				this.$store.commit('ui/setNodeViewInitialized', false);
			}
    },
	},
	async mounted() {
		const workflowExecutions = await this.loadExecutions();
		this.$store.commit('workflows/setCurrentWorkflowExecutions', workflowExecutions);
		if (this.activeExecution) {
			this.$router.push({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: this.currentWorkflow, executionId: this.activeExecution.id },
			}).catch(()=>{});;
		}
		if (this.workflowDataNotLoaded || (this.$route.params.name !== this.$store.getters.workflowId)) {
			if (this.$store.getters['nodeTypes/allNodeTypes'].length === 0) {
				await this.$store.dispatch('nodeTypes/getNodeTypes');
			}
			await this.openWorkflow(this.$route.params.name);
			const executions = await await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions', { status: '' });
			this.$store.commit('workflows/setCurrentWorkflowExecutions', executions);
			this.$store.commit('ui/setNodeViewInitialized', false);
		}
	},
	methods: {
		async onDeleteCurrentExecution (): Promise<void> {
			this.loading = true;
			try {
				await this.restApi().deleteExecutions({ ids: [ this.$route.params.executionId ] });
				await this.setExecutions();
			} catch (error) {
				this.loading = false;
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.handleDeleteSelected.title'),
				);
				return;
			}
			this.loading = false;

			this.$showMessage({
				title: this.$locale.baseText('executionsList.showMessage.handleDeleteSelected.title'),
				type: 'success',
			});
		},
		onFilterUpdated (newFilter: { finished: boolean, status: string }): void {
			this.filter = newFilter;
			this.setExecutions();
		},
		async setExecutions(): Promise<void> {
			this.loading = true;
			const workflowExecutions = await this.loadExecutions();
			this.$store.commit('workflows/setCurrentWorkflowExecutions', workflowExecutions);
			this.loading = false;
		},
		async loadAutoRefresh(): Promise<void> {
			// Most of the auto-refresh logic is taken from the `ExecutionsList` component
			const fetchedExecutions: IExecutionsSummary[] = await this.loadExecutions();
			let existingExecutions: IExecutionsSummary[] = [ ...this.executions ];
			const alreadyPresentExecutionIds = existingExecutions.map(exec => parseInt(exec.id, 10));
			let lastId = 0;
			const gaps = [] as number[];

			for(let i = fetchedExecutions.length - 1; i >= 0; i--) {
				const currentItem = fetchedExecutions[i];
				const currentId = parseInt(currentItem.id, 10);
				if (lastId !== 0 && isNaN(currentId) === false) {
					if (currentId - lastId > 1) {
						const range = _range(lastId + 1, currentId);
						gaps.push(...range);
					}
				}
				lastId = parseInt(currentItem.id, 10) || 0;

				const executionIndex = alreadyPresentExecutionIds.indexOf(currentId);
				if (executionIndex !== -1) {
					const existingExecution = existingExecutions.find(ex => ex.id === currentItem.id);
					const existingStillRunning = existingExecution && existingExecution.finished === false || existingExecution?.stoppedAt === undefined;
					const currentFinished =  currentItem.finished === true || currentItem.stoppedAt !== undefined;

					if (existingStillRunning && currentFinished) {
						existingExecutions[executionIndex] = currentItem;
					}
					continue;
				}

				let j;
				for (j = existingExecutions.length - 1; j >= 0; j--) {
					if (currentId < parseInt(existingExecutions[j].id, 10)) {
						existingExecutions.splice(j + 1, 0, currentItem);
						break;
					}
				}
				if (j === -1) {
					existingExecutions.unshift(currentItem);
				}
			}

			existingExecutions = existingExecutions.filter(execution => !gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10));
			this.$store.commit('workflows/setCurrentWorkflowExecutions', existingExecutions);
			this.setActiveExecution();
		},
		async loadExecutions(): Promise<IExecutionsSummary[]> {
			if (!this.currentWorkflow) {
				return [];
			}
			try {
				const executions: IExecutionsSummary[] =
					await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions', this.filter);
				return executions;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.refreshData.title'),
				);
				return [];
			}
		},
		setActiveExecution(): void {
			const activeExecutionId = this.$route.params.executionId;
			if (activeExecutionId) {
				const execution = this.$store.getters['workflows/getExecutionDataById'](activeExecutionId);
				if (execution) {
					this.$store.commit('workflows/setActiveWorkflowExecution', execution);
				}
			}
		},
		async openWorkflow(workflowId: string): Promise<void> {
			await this.loadActiveWorkflows();

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
		async loadActiveWorkflows(): Promise<void> {
			const activeWorkflows = await this.restApi().getActiveWorkflows();
			this.$store.commit('setActiveWorkflows', activeWorkflows);
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
