<template>
	<div :class="$style.container" v-if="!loading">
		<executions-sidebar
			v-if="showSidebar"
			:executions="executions"
			:loading="loading"
			:loadingMore="loadingMore"
			@reloadExecutions="setExecutions"
			@filterUpdated="onFilterUpdated"
			@loadMore="loadMore"
			@retryExecution="onRetryExecution"
			@refresh="loadAutoRefresh"
		/>
		<div :class="$style.content" v-if="!hidePreview">
			<router-view name="executionPreview" @deleteCurrentExecution="onDeleteCurrentExecution" @retryExecution="onRetryExecution"/>
		</div>
		<div v-if="executions.length === 0 && filterApplied" :class="$style.noResultsContainer">
			<n8n-text color="text-base" size="medium" align="center">
				{{ $locale.baseText('executionsLandingPage.noResults') }}
			</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import ExecutionsSidebar from '@/components/ExecutionsView/ExecutionsSidebar.vue';
import { MODAL_CANCEL, MODAL_CLOSE, MODAL_CONFIRMED, PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS, WEBHOOK_NODE_TYPE } from '@/constants';
import { IExecutionsListResponse, IExecutionsSummary, INodeUi, ITag, IWorkflowDb } from '@/Interface';
import { IConnection, IConnections, IDataObject, INodeTypeDescription, INodeTypeNameVersion, IWorkflowSettings, NodeHelpers } from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { restApi } from '../mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import { v4 as uuid } from 'uuid';
import { Route } from 'vue-router';
import { executionHelpers } from '../mixins/executionsHelpers';
import { range as _range } from 'lodash';
import { debounceHelper } from '../mixins/debounce';
import { getNodeViewTab } from '../helpers';
import { workflowHelpers } from '../mixins/workflowHelpers';

export default mixins(restApi, showMessage, executionHelpers, debounceHelper, workflowHelpers).extend({
	name: 'executions-page',
	components: {
		ExecutionsSidebar,
	},
	data() {
		return {
			loading: false,
			loadingMore: false,
			filter: { finished: true, status: '' },
		};
	},
	computed: {
		hidePreview(): boolean {
			const nothingToShow = this.executions.length === 0 && this.filterApplied;
			const activeNotPresent = this.filterApplied && (this.executions as IExecutionsSummary[]).find(ex => ex.id === this.activeExecution.id) === undefined;
			return this.loading || nothingToShow || activeNotPresent;
		},
		showSidebar(): boolean {
			if (this.executions.length === 0) {
				return this.filterApplied;
			}
			return true;
		},
		filterApplied(): boolean {
			return this.filter.status !== '';
		},
		workflowDataNotLoaded(): boolean {
			return this.$store.getters.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID && this.$store.getters.workflowName === '';
		},
		loadedFinishedExecutionsCount(): number {
			return (this.$store.getters['workflows/getAllLoadedFinishedExecutions'] as IExecutionsSummary[]).length;
		},
		totalFinishedExecutionsCount(): number {
			return this.$store.getters['workflows/getTotalFinishedExecutionsCount'];
		},
	},
	watch:{
    $route (to: Route, from: Route) {
			const workflowChanged = from.params.name !== to.params.name;
			this.initView(workflowChanged);

			if (to.params.executionId) {
				const execution = this.$store.getters['workflows/getExecutionDataById'](to.params.executionId);
				if (execution) {
					this.$store.commit('workflows/setActiveWorkflowExecution', execution);
				}
			}
		},
	},
	async beforeRouteLeave(to, from, next) {
		const nextTab = getNodeViewTab(to);
		// When leaving for a page that's not a workflow view tab, ask to save changes
		if (!nextTab) {
			const result = this.$store.getters.getStateIsDirty;
			if (result) {
				const confirmModal = await this.confirmModal(
					this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
					this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
					'warning',
					this.$locale.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
					this.$locale.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
					true,
				);

				if (confirmModal === MODAL_CONFIRMED) {
					const saved = await this.saveCurrentWorkflow({}, false);
					if (saved) this.$store.dispatch('settings/fetchPromptsData');
					this.$store.commit('setStateDirty', false);
					next();
				} else if (confirmModal === MODAL_CANCEL) {
					this.$store.commit('setStateDirty', false);
					next();
				} else if (confirmModal === MODAL_CLOSE) {
					next(false);
				}
			} else {
				next();
			}
		}
		next();
	},
	async mounted() {
		this.loading = true;
		const workflowUpdated = this.$route.params.name !== this.$store.getters.workflowId;
		const onNewWorkflow = this.$route.params.name === 'new' && this.$store.getters.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID;
		const shouldUpdate = workflowUpdated && !onNewWorkflow;
		await this.initView(shouldUpdate);
		if (!shouldUpdate) {
			await this.setExecutions();
		}
		this.loading = false;
	},
	methods: {
		async initView(loadWorkflow: boolean) : Promise<void> {
			if (loadWorkflow) {
				if (this.$store.getters['nodeTypes/allNodeTypes'].length === 0) {
					await this.$store.dispatch('nodeTypes/getNodeTypes');
				}
				await this.openWorkflow(this.$route.params.name);
				this.$store.commit('ui/setNodeViewInitialized', false);
				this.setExecutions();
				if (this.activeExecution) {
					this.$router.push({
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: this.currentWorkflow, executionId: this.activeExecution.id },
					}).catch(()=>{});;
				}
			}
		},
		async onLoadMore(): Promise<void> {
			if (!this.loadingMore) {
				this.callDebounced("loadMore", { debounceTime: 1000 });
			}
		},
		async loadMore(): Promise<void> {
			if (this.filter.status === 'running' || this.loadedFinishedExecutionsCount >= this.totalFinishedExecutionsCount) {
				return;
			}
			this.loadingMore = true;

			let lastId: string | number | undefined;
			if (this.executions.length !== 0) {
				const lastItem = this.executions.slice(-1)[0];
				lastId = lastItem.id;
			}

			const requestFilter: IDataObject = { workflowId: this.currentWorkflow };
			if (this.filter.status === 'waiting') {
				requestFilter.waitTill = true;
			} else if (this.filter.status !== '')  {
				requestFilter.finished = this.filter.status === 'success';
			}
			let data: IExecutionsListResponse;
			try {
				data = await this.restApi().getPastExecutions(requestFilter, 20, lastId);
			} catch (error) {
				this.loadingMore = false;
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.loadMore.title'),
				);
				return;
			}

			data.results = data.results.map((execution) => {
				// @ts-ignore
				return { ...execution, mode: execution.mode };
			});
			const currentExecutions = [ ...this.executions ];
			for (const newExecution of data.results) {
				if (currentExecutions.find(ex => ex.id === newExecution.id) === undefined) {
					currentExecutions.push(newExecution);
				}
			}
			this.$store.commit('workflows/setCurrentWorkflowExecutions', currentExecutions);
			this.loadingMore = false;
		},
		async onDeleteCurrentExecution(): Promise<void> {
			this.loading = true;
			try {
				await this.restApi().deleteExecutions({ ids: [ this.$route.params.executionId ] });
				await this.setExecutions();
				// Select first execution in the list after deleting the current one
				if (this.executions.length > 0) {
					this.$store.commit('workflows/setActiveWorkflowExecution', this.executions[0]);
					this.$router.push({
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: this.currentWorkflow, executionId: this.executions[0].id },
					}).catch(()=>{});;
				} else { // If there are no executions left, show empty state and clear active execution from the store
					this.$store.commit('workflows/setActiveWorkflowExecution', null);
					this.$router.push({ name: VIEWS.EXECUTION_HOME, params: { name: this.currentWorkflow } });
				}
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
		onFilterUpdated(newFilter: { finished: boolean, status: string }): void {
			this.filter = newFilter;
			this.setExecutions();
		},
		async setExecutions(): Promise<void> {
			const workflowExecutions = await this.loadExecutions();
			this.$store.commit('workflows/setCurrentWorkflowExecutions', workflowExecutions);
			this.setActiveExecution();
		},
		async loadAutoRefresh(): Promise<void> {
			// Most of the auto-refresh logic is taken from the `ExecutionsList` component
			const fetchedExecutions: IExecutionsSummary[] = await this.loadExecutions();
			let existingExecutions: IExecutionsSummary[] = [ ...this.executions ];
			const alreadyPresentExecutionIds = existingExecutions.map(exec => parseInt(exec.id, 10));
			let lastId = 0;
			const gaps = [] as number[];
			let updatedActiveExecution = null;

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
						if (currentItem.id === this.activeExecution.id) {
							updatedActiveExecution = currentItem;
						}
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
			if (updatedActiveExecution !== null) {
				this.$store.commit('workflows/setActiveWorkflowExecution', updatedActiveExecution);
			} else {
				const activeNotInTheList = existingExecutions.find(ex => ex.id === this.activeExecution.id) === undefined;
				if (activeNotInTheList) {
					this.$router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: this.currentWorkflow, executionId: this.executions[0].id },
				}).catch(()=>{});;
				}
			}
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
			// If there is no execution in the route, select the first one
			if (this.$store.getters['workflows/getActiveWorkflowExecution'] === null && this.executions.length > 0) {
				this.$store.commit('workflows/setActiveWorkflowExecution', this.executions[0]);
				this.$router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: this.currentWorkflow, executionId: this.executions[0].id },
				}).catch(()=>{});;
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
				this.$store.commit('setStateDirty', false);
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
		async onRetryExecution(payload: { execution: IExecutionsSummary, command: string }) {
			const loadWorkflow = payload.command === 'current-workflow';

			this.$showMessage({
				title: this.$locale.baseText('executionDetails.runningMessage'),
				type: 'info',
				duration: 2000,
			});
			await this.retryExecution(payload.execution, loadWorkflow);
			this.loadAutoRefresh();

			this.$telemetry.track('User clicked retry execution button', {
				workflow_id: this.$store.getters.workflowId,
				execution_id: payload.execution.id,
				retry_type: loadWorkflow ? 'current' : 'original',
			});
		},
		async retryExecution(execution: IExecutionsSummary, loadWorkflow?: boolean) {
			try {
				const retrySuccessful = await this.restApi().retryExecution(execution.id, loadWorkflow);

				if (retrySuccessful === true) {
					this.$showMessage({
						title: this.$locale.baseText('executionsList.showMessage.retrySuccessfulTrue.title'),
						type: 'success',
					});
				} else {
					this.$showMessage({
						title: this.$locale.baseText('executionsList.showMessage.retrySuccessfulFalse.title'),
						type: 'error',
					});
				}

			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.retryExecution.title'),
				);
			}
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

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing-2xl);
	text-align: center;
}

</style>
