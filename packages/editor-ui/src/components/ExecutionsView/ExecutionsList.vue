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
			<router-view
				name="executionPreview"
				@deleteCurrentExecution="onDeleteCurrentExecution"
				@retryExecution="onRetryExecution"
				@stopExecution="onStopExecution"
			/>
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
import {
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRMED,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import {
	IExecutionsListResponse,
	IExecutionsSummary,
	INodeUi,
	ITag,
	IWorkflowDb,
} from '@/Interface';
import {
	IConnection,
	IConnections,
	IDataObject,
	INodeTypeDescription,
	INodeTypeNameVersion,
	NodeHelpers,
} from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { restApi } from '@/mixins/restApi';
import { showMessage } from '@/mixins/showMessage';
import { v4 as uuid } from 'uuid';
import { Route } from 'vue-router';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { range as _range } from 'lodash';
import { debounceHelper } from '@/mixins/debounce';
import { getNodeViewTab } from '@/utils';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useTagsStore } from '@/stores/tags';

export default mixins(
	restApi,
	showMessage,
	executionHelpers,
	debounceHelper,
	workflowHelpers,
).extend({
	name: 'executions-list',
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
		...mapStores(useTagsStore, useNodeTypesStore, useSettingsStore, useUIStore, useWorkflowsStore),
		hidePreview(): boolean {
			const nothingToShow = this.executions.length === 0 && this.filterApplied;
			const activeNotPresent =
				this.filterApplied &&
				(this.executions as IExecutionsSummary[]).find(
					(ex) => ex.id === this.activeExecution.id,
				) === undefined;
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
			return (
				this.workflowsStore.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID &&
				this.workflowsStore.workflowName === ''
			);
		},
		loadedFinishedExecutionsCount(): number {
			return this.workflowsStore.getAllLoadedFinishedExecutions.length;
		},
		totalFinishedExecutionsCount(): number {
			return this.workflowsStore.getTotalFinishedExecutionsCount;
		},
	},
	watch: {
		$route(to: Route, from: Route) {
			const workflowChanged = from.params.name !== to.params.name;
			this.initView(workflowChanged);

			if (to.params.executionId) {
				const execution = this.workflowsStore.getExecutionDataById(to.params.executionId);
				if (execution) {
					this.workflowsStore.activeWorkflowExecution = execution;
				}
			}
		},
	},
	async beforeRouteLeave(to, from, next) {
		const nextTab = getNodeViewTab(to);
		// When leaving for a page that's not a workflow view tab, ask to save changes
		if (!nextTab) {
			const result = this.uiStore.stateIsDirty;
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
					if (saved) this.settingsStore.fetchPromptsData();
					this.uiStore.stateIsDirty = false;
					next();
				} else if (confirmModal === MODAL_CANCEL) {
					this.uiStore.stateIsDirty = false;
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
		const workflowUpdated = this.$route.params.name !== this.workflowsStore.workflowId;
		const onNewWorkflow =
			this.$route.params.name === 'new' &&
			this.workflowsStore.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID;
		const shouldUpdate = workflowUpdated && !onNewWorkflow;
		await this.initView(shouldUpdate);
		if (!shouldUpdate) {
			if (this.workflowsStore.currentWorkflowExecutions.length > 0) {
				const workflowExecutions = await this.loadExecutions();
				this.workflowsStore.addToCurrentExecutions(workflowExecutions);
				await this.setActiveExecution();
			} else {
				await this.setExecutions();
			}
		}
		this.loading = false;
	},
	methods: {
		async initView(loadWorkflow: boolean): Promise<void> {
			if (loadWorkflow) {
				if (this.nodeTypesStore.allNodeTypes.length === 0) {
					await this.nodeTypesStore.getNodeTypes();
				}
				await this.openWorkflow(this.$route.params.name);
				this.uiStore.nodeViewInitialized = false;
				if (this.workflowsStore.currentWorkflowExecutions.length === 0) {
					this.setExecutions();
				}
				if (this.activeExecution) {
					this.$router
						.push({
							name: VIEWS.EXECUTION_PREVIEW,
							params: { name: this.currentWorkflow, executionId: this.activeExecution.id },
						})
						.catch(() => {});
				}
			}
		},
		async onLoadMore(): Promise<void> {
			if (!this.loadingMore) {
				this.callDebounced('loadMore', { debounceTime: 1000 });
			}
		},
		async loadMore(limit = 20): Promise<void> {
			if (
				this.filter.status === 'running' ||
				this.loadedFinishedExecutionsCount >= this.totalFinishedExecutionsCount
			) {
				return;
			}
			this.loadingMore = true;

			let lastId: string | undefined;
			if (this.executions.length !== 0) {
				const lastItem = this.executions.slice(-1)[0];
				lastId = lastItem.id;
			}

			const requestFilter: IDataObject = { workflowId: this.currentWorkflow };
			if (this.filter.status === 'waiting') {
				requestFilter.waitTill = true;
			} else if (this.filter.status !== '') {
				requestFilter.finished = this.filter.status === 'success';
			}
			let data: IExecutionsListResponse;
			try {
				data = await this.restApi().getPastExecutions(requestFilter, limit, lastId);
			} catch (error) {
				this.loadingMore = false;
				this.$showError(error, this.$locale.baseText('executionsList.showError.loadMore.title'));
				return;
			}

			data.results = data.results.map((execution) => {
				// @ts-ignore
				return { ...execution, mode: execution.mode };
			});
			const currentExecutions = [...this.executions];
			for (const newExecution of data.results) {
				if (currentExecutions.find((ex) => ex.id === newExecution.id) === undefined) {
					currentExecutions.push(newExecution);
				}
			}
			this.workflowsStore.currentWorkflowExecutions = currentExecutions;
			this.loadingMore = false;
		},
		async onDeleteCurrentExecution(): Promise<void> {
			this.loading = true;
			try {
				await this.restApi().deleteExecutions({ ids: [this.$route.params.executionId] });
				await this.setExecutions();
				// Select first execution in the list after deleting the current one
				if (this.executions.length > 0) {
					this.workflowsStore.activeWorkflowExecution = this.executions[0];
					this.$router
						.push({
							name: VIEWS.EXECUTION_PREVIEW,
							params: { name: this.currentWorkflow, executionId: this.executions[0].id },
						})
						.catch(() => {});
				} else {
					// If there are no executions left, show empty state and clear active execution from the store
					this.workflowsStore.activeWorkflowExecution = null;
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
		async onStopExecution(): Promise<void> {
			const activeExecutionId = this.$route.params.executionId;

			try {
				await this.restApi().stopCurrentExecution(activeExecutionId);

				this.$showMessage({
					title: this.$locale.baseText('executionsList.showMessage.stopExecution.title'),
					message: this.$locale.baseText('executionsList.showMessage.stopExecution.message', {
						interpolate: { activeExecutionId },
					}),
					type: 'success',
				});

				this.loadAutoRefresh();
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.stopExecution.title'),
				);
			}
		},
		onFilterUpdated(newFilter: { finished: boolean; status: string }): void {
			this.filter = newFilter;
			this.setExecutions();
		},
		async setExecutions(): Promise<void> {
			const workflowExecutions = await this.loadExecutions();
			this.workflowsStore.currentWorkflowExecutions = workflowExecutions;
			await this.setActiveExecution();
		},
		async loadAutoRefresh(): Promise<void> {
			// Most of the auto-refresh logic is taken from the `ExecutionsList` component
			const fetchedExecutions: IExecutionsSummary[] = await this.loadExecutions();
			let existingExecutions: IExecutionsSummary[] = [...this.executions];
			const alreadyPresentExecutionIds = existingExecutions.map((exec) => parseInt(exec.id, 10));
			let lastId = 0;
			const gaps = [] as number[];
			let updatedActiveExecution = null;

			for (let i = fetchedExecutions.length - 1; i >= 0; i--) {
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
					const existingExecution = existingExecutions.find((ex) => ex.id === currentItem.id);
					const existingStillRunning =
						(existingExecution && existingExecution.finished === false) ||
						existingExecution?.stoppedAt === undefined;
					const currentFinished =
						currentItem.finished === true || currentItem.stoppedAt !== undefined;

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

			existingExecutions = existingExecutions.filter(
				(execution) =>
					!gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10),
			);
			this.workflowsStore.currentWorkflowExecutions = existingExecutions;
			if (updatedActiveExecution !== null) {
				this.workflowsStore.activeWorkflowExecution = updatedActiveExecution;
			} else {
				const activeNotInTheList =
					existingExecutions.find((ex) => ex.id === this.activeExecution.id) === undefined;
				if (activeNotInTheList && this.executions.length > 0) {
					this.$router
						.push({
							name: VIEWS.EXECUTION_PREVIEW,
							params: { name: this.currentWorkflow, executionId: this.executions[0].id },
						})
						.catch(() => {});
				} else if (this.executions.length === 0) {
					this.$router.push({ name: VIEWS.EXECUTION_HOME }).catch(() => {});
					this.workflowsStore.activeWorkflowExecution = null;
				}
			}
		},
		async loadExecutions(): Promise<IExecutionsSummary[]> {
			if (!this.currentWorkflow) {
				return [];
			}
			try {
				const executions: IExecutionsSummary[] =
					await this.workflowsStore.loadCurrentWorkflowExecutions(this.filter);
				return executions;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('executionsList.showError.refreshData.title'));
				return [];
			}
		},
		async setActiveExecution(): Promise<void> {
			const activeExecutionId = this.$route.params.executionId;
			if (activeExecutionId) {
				const execution = this.workflowsStore.getExecutionDataById(activeExecutionId);
				if (execution) {
					this.workflowsStore.activeWorkflowExecution = execution;
				} else {
					await this.tryToFindExecution(activeExecutionId);
				}
			}

			// If there is no execution in the route, select the first one
			if (this.workflowsStore.activeWorkflowExecution === null && this.executions.length > 0) {
				this.workflowsStore.activeWorkflowExecution = this.executions[0];
				this.$router
					.push({
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: this.currentWorkflow, executionId: this.executions[0].id },
					})
					.catch(() => {});
			}
		},
		async tryToFindExecution(executionId: string, attemptCount = 0): Promise<void> {
			// First check if executions exists in the DB at all
			if (attemptCount === 0) {
				const executionExists = await this.workflowsStore.fetchExecutionDataById(executionId);
				if (!executionExists) {
					this.workflowsStore.activeWorkflowExecution = null;
					this.$showError(
						new Error(
							this.$locale.baseText('executionView.notFound.message', {
								interpolate: { executionId },
							}),
						),
						this.$locale.baseText('nodeView.showError.openExecution.title'),
					);
					return;
				}
			}

			// stop if the execution wasn't found in the first 1000 lookups
			if (attemptCount >= 10) return;

			// Fetch next batch of executions
			await this.loadMore(100);
			const execution = this.workflowsStore.getExecutionDataById(executionId);
			if (!execution) {
				// If it's not there load next until found
				await this.$nextTick();
				// But skip fetching execution data since we at this point know it exists
				await this.tryToFindExecution(executionId, attemptCount + 1);
			} else {
				// When found set execution as active
				this.workflowsStore.activeWorkflowExecution = execution;
				return;
			}
		},
		async openWorkflow(workflowId: string): Promise<void> {
			await this.loadActiveWorkflows();

			let data: IWorkflowDb | undefined;
			try {
				data = await this.restApi().getWorkflow(workflowId);
			} catch (error) {
				this.$showError(error, this.$locale.baseText('nodeView.showError.openWorkflow.title'));
				return;
			}
			if (data === undefined) {
				throw new Error(
					this.$locale.baseText('nodeView.workflowWithIdCouldNotBeFound', {
						interpolate: { workflowId },
					}),
				);
			}
			await this.addNodes(data.nodes, data.connections);

			this.workflowsStore.setActive(data.active || false);
			this.workflowsStore.setWorkflowId(workflowId);
			this.workflowsStore.setWorkflowName({ newName: data.name, setStateDirty: false });
			this.workflowsStore.setWorkflowSettings(data.settings || {});
			this.workflowsStore.setWorkflowPinData(data.pinData || {});
			const tags = (data.tags || []) as ITag[];
			const tagIds = tags.map((tag) => tag.id);
			this.workflowsStore.setWorkflowTagIds(tagIds || []);
			this.workflowsStore.setWorkflowVersionId(data.versionId);

			this.tagsStore.upsertTags(tags);

			this.$externalHooks().run('workflow.open', { workflowId, workflowName: data.name });
			this.uiStore.stateIsDirty = false;
		},
		async addNodes(nodes: INodeUi[], connections?: IConnections) {
			if (!nodes || !nodes.length) {
				return;
			}

			await this.loadNodesProperties(
				nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
			);

			let nodeType: INodeTypeDescription | null;
			nodes.forEach((node) => {
				if (!node.id) {
					node.id = uuid();
				}

				nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

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
						nodeParameters = NodeHelpers.getNodeParameters(
							nodeType.properties,
							node.parameters,
							true,
							false,
							node,
						);
					} catch (e) {
						console.error(
							this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
								`: "${node.name}"`,
						); // eslint-disable-line no-console
						console.error(e); // eslint-disable-line no-console
					}
					node.parameters = nodeParameters !== null ? nodeParameters : {};

					// if it's a webhook and the path is empty set the UUID as the default path
					if (node.type === WEBHOOK_NODE_TYPE && node.parameters.path === '') {
						node.parameters.path = node.webhookId as string;
					}
				}

				this.workflowsStore.addNode(node);
			});

			// Load the connections
			if (connections !== undefined) {
				let connectionData;
				for (const sourceNode of Object.keys(connections)) {
					for (const type of Object.keys(connections[sourceNode])) {
						for (
							let sourceIndex = 0;
							sourceIndex < connections[sourceNode][type].length;
							sourceIndex++
						) {
							const outwardConnections = connections[sourceNode][type][sourceIndex];
							if (!outwardConnections) {
								continue;
							}
							outwardConnections.forEach((targetData) => {
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

								this.workflowsStore.addConnection({
									connection: connectionData,
									setStateDirty: false,
								});
							});
						}
					}
				}
			}
		},
		async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
			const allNodes: INodeTypeDescription[] = this.nodeTypesStore.allNodeTypes;

			const nodesToBeFetched: INodeTypeNameVersion[] = [];
			allNodes.forEach((node) => {
				const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
				if (
					!!nodeInfos.find((n) => n.name === node.name && nodeVersions.includes(n.version)) &&
					!node.hasOwnProperty('properties')
				) {
					nodesToBeFetched.push({
						name: node.name,
						version: Array.isArray(node.version) ? node.version.slice(-1)[0] : node.version,
					});
				}
			});

			if (nodesToBeFetched.length > 0) {
				// Only call API if node information is actually missing
				await this.nodeTypesStore.getNodesInformation(nodesToBeFetched);
			}
		},
		async loadActiveWorkflows(): Promise<void> {
			const activeWorkflows = await this.restApi().getActiveWorkflows();
			this.workflowsStore.activeWorkflows = activeWorkflows;
		},
		async onRetryExecution(payload: { execution: IExecutionsSummary; command: string }) {
			const loadWorkflow = payload.command === 'current-workflow';

			this.$showMessage({
				title: this.$locale.baseText('executionDetails.runningMessage'),
				type: 'info',
				duration: 2000,
			});
			await this.retryExecution(payload.execution, loadWorkflow);
			this.loadAutoRefresh();

			this.$telemetry.track('User clicked retry execution button', {
				workflow_id: this.workflowsStore.workflowId,
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
