<template>
	<div :class="$style.container">
		<executions-sidebar
			:executions="executions"
			:loading="loading && !executions.length"
			:loadingMore="loadingMore"
			:temporaryExecution="temporaryExecution"
			@reloadExecutions="setExecutions"
			@filterUpdated="onFilterUpdated"
			@loadMore="onLoadMore"
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
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import ExecutionsSidebar from '@/components/ExecutionsView/ExecutionsSidebar.vue';
import {
	MAIN_HEADER_TABS,
	MODAL_CANCEL,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import type {
	ExecutionFilterType,
	IExecutionsListResponse,
	INodeUi,
	ITag,
	IWorkflowDb,
} from '@/Interface';
import type {
	IExecutionsSummary,
	IConnection,
	IConnections,
	IDataObject,
	INodeTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { useToast, useMessage } from '@/composables';
import { v4 as uuid } from 'uuid';
import type { Route } from 'vue-router';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { range as _range } from 'lodash-es';
import { debounceHelper } from '@/mixins/debounce';
import { getNodeViewTab, NO_NETWORK_ERROR_CODE } from '@/utils';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useTagsStore } from '@/stores/tags.store';
import { executionFilterToQueryFilter } from '@/utils/executionUtils';

// Number of execution pages that are fetched before temporary execution card is shown
const MAX_LOADING_ATTEMPTS = 5;
// Number of executions fetched on each page
const LOAD_MORE_PAGE_SIZE = 100;

export default defineComponent({
	name: 'executions-list',
	mixins: [executionHelpers, debounceHelper, workflowHelpers],
	components: {
		ExecutionsSidebar,
	},
	data() {
		return {
			loading: false,
			loadingMore: false,
			filter: {} as ExecutionFilterType,
			temporaryExecution: null as IExecutionsSummary | null,
		};
	},
	setup() {
		return {
			...useToast(),
			...useMessage(),
		};
	},
	computed: {
		...mapStores(useTagsStore, useNodeTypesStore, useSettingsStore, useUIStore, useWorkflowsStore),
		hidePreview(): boolean {
			const activeNotPresent =
				this.filterApplied &&
				!(this.executions as IExecutionsSummary[]).find((ex) => ex.id === this.activeExecution?.id);
			return this.loading || !this.executions.length || activeNotPresent;
		},
		filterApplied(): boolean {
			return this.filter.status !== 'all';
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
		requestFilter(): IDataObject {
			return executionFilterToQueryFilter({
				...this.filter,
				workflowId: this.currentWorkflow,
			});
		},
	},
	watch: {
		$route(to: Route, from: Route) {
			const workflowChanged = from.params.name !== to.params.name;
			void this.initView(workflowChanged);

			if (to.params.executionId) {
				const execution = this.workflowsStore.getExecutionDataById(to.params.executionId);
				if (execution) {
					this.workflowsStore.activeWorkflowExecution = execution;
				}
			}
		},
	},
	async beforeRouteLeave(to, from, next) {
		if (getNodeViewTab(to) === MAIN_HEADER_TABS.WORKFLOW) {
			next();
			return;
		}
		if (this.uiStore.stateIsDirty) {
			const confirmModal = await this.confirm(
				this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
				{
					title: this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
					type: 'warning',
					confirmButtonText: this.$locale.baseText(
						'generic.unsavedWork.confirmMessage.confirmButtonText',
					),
					cancelButtonText: this.$locale.baseText(
						'generic.unsavedWork.confirmMessage.cancelButtonText',
					),
					showClose: true,
				},
			);

			if (confirmModal === MODAL_CONFIRM) {
				const saved = await this.saveCurrentWorkflow({}, false);
				if (saved) {
					await this.settingsStore.fetchPromptsData();
				}
				this.uiStore.stateIsDirty = false;
				next();
			} else if (confirmModal === MODAL_CANCEL) {
				this.uiStore.stateIsDirty = false;
				next();
			}
		} else {
			next();
		}
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
					await this.setExecutions();
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
				await this.callDebounced('loadMore', { debounceTime: 1000 });
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

			let data: IExecutionsListResponse;
			try {
				data = await this.workflowsStore.getPastExecutions(this.requestFilter, limit, lastId);
			} catch (error) {
				this.loadingMore = false;
				this.showError(error, this.$locale.baseText('executionsList.showError.loadMore.title'));
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
				// If we loaded temp execution, put it into it's place and remove from top of the list
				if (newExecution.id === this.temporaryExecution?.id) {
					this.temporaryExecution = null;
				}
			}
			this.workflowsStore.currentWorkflowExecutions = currentExecutions;
			this.loadingMore = false;
		},
		async onDeleteCurrentExecution(): Promise<void> {
			this.loading = true;
			try {
				const executionIndex = this.executions.findIndex(
					(execution: IExecutionsSummary) => execution.id === this.$route.params.executionId,
				);
				const nextExecution =
					this.executions[executionIndex + 1] ||
					this.executions[executionIndex - 1] ||
					this.executions[0];

				await this.workflowsStore.deleteExecutions({ ids: [this.$route.params.executionId] });
				if (this.temporaryExecution?.id === this.$route.params.executionId) {
					this.temporaryExecution = null;
				}
				if (this.executions.length > 0) {
					await this.$router
						.push({
							name: VIEWS.EXECUTION_PREVIEW,
							params: { name: this.currentWorkflow, executionId: nextExecution.id },
						})
						.catch(() => {});
					this.workflowsStore.activeWorkflowExecution = nextExecution;
				} else {
					// If there are no executions left, show empty state and clear active execution from the store
					this.workflowsStore.activeWorkflowExecution = null;
					await this.$router.push({
						name: VIEWS.EXECUTION_HOME,
						params: { name: this.currentWorkflow },
					});
				}
				await this.setExecutions();
			} catch (error) {
				this.loading = false;
				this.showError(
					error,
					this.$locale.baseText('executionsList.showError.handleDeleteSelected.title'),
				);
				return;
			}
			this.loading = false;

			this.showMessage({
				title: this.$locale.baseText('executionsList.showMessage.handleDeleteSelected.title'),
				type: 'success',
			});
		},
		async onStopExecution(): Promise<void> {
			const activeExecutionId = this.$route.params.executionId;

			try {
				await this.workflowsStore.stopCurrentExecution(activeExecutionId);

				this.showMessage({
					title: this.$locale.baseText('executionsList.showMessage.stopExecution.title'),
					message: this.$locale.baseText('executionsList.showMessage.stopExecution.message', {
						interpolate: { activeExecutionId },
					}),
					type: 'success',
				});

				await this.loadAutoRefresh();
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('executionsList.showError.stopExecution.title'),
				);
			}
		},
		async onFilterUpdated(filter: ExecutionFilterType): void {
			this.filter = filter;
			await this.setExecutions();
		},
		async setExecutions(): Promise<void> {
			this.workflowsStore.currentWorkflowExecutions = await this.loadExecutions();
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
				if (lastId !== 0 && !isNaN(currentId)) {
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
						if (currentItem.id === this.activeExecution?.id) {
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
				const activeInList = existingExecutions.some((ex) => ex.id === this.activeExecution?.id);
				if (!activeInList && this.executions.length > 0 && !this.temporaryExecution) {
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
				return await this.workflowsStore.loadCurrentWorkflowExecutions(this.requestFilter);
			} catch (error) {
				if (error.errorCode === NO_NETWORK_ERROR_CODE) {
					this.showMessage(
						{
							title: this.$locale.baseText('executionsList.showError.refreshData.title'),
							message: error.message,
							type: 'error',
							duration: 3500,
						},
						false,
					);
				} else {
					this.showError(
						error,
						this.$locale.baseText('executionsList.showError.refreshData.title'),
					);
				}
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
			if (
				this.workflowsStore.activeWorkflowExecution === null &&
				this.executions.length > 0 &&
				!this.temporaryExecution
			) {
				this.workflowsStore.activeWorkflowExecution = this.executions[0];

				if (this.$route.name === VIEWS.EXECUTION_HOME) {
					this.$router
						.push({
							name: VIEWS.EXECUTION_PREVIEW,
							params: { name: this.currentWorkflow, executionId: this.executions[0].id },
						})
						.catch(() => {});
				}
			}
		},
		async tryToFindExecution(executionId: string, attemptCount = 0): Promise<void> {
			// First check if executions exists in the DB at all
			if (attemptCount === 0) {
				const existingExecution = await this.workflowsStore.fetchExecutionDataById(executionId);
				if (!existingExecution) {
					this.workflowsStore.activeWorkflowExecution = null;
					this.showError(
						new Error(
							this.$locale.baseText('executionView.notFound.message', {
								interpolate: { executionId },
							}),
						),
						this.$locale.baseText('nodeView.showError.openExecution.title'),
					);
					return;
				} else {
					this.temporaryExecution = existingExecution as IExecutionsSummary;
				}
			}
			// stop if the execution wasn't found in the first 1000 lookups
			if (attemptCount >= MAX_LOADING_ATTEMPTS) {
				if (this.temporaryExecution) {
					this.workflowsStore.activeWorkflowExecution = this.temporaryExecution;
					return;
				}
				this.workflowsStore.activeWorkflowExecution = null;
				return;
			}
			// Fetch next batch of executions
			await this.loadMore(LOAD_MORE_PAGE_SIZE);
			const execution = this.workflowsStore.getExecutionDataById(executionId);
			if (!execution) {
				// If it's not there load next until found
				await this.$nextTick();
				// But skip fetching execution data since we at this point know it exists
				await this.tryToFindExecution(executionId, attemptCount + 1);
			} else {
				// When found set execution as active
				this.workflowsStore.activeWorkflowExecution = execution;
				this.temporaryExecution = null;
				return;
			}
		},
		async openWorkflow(workflowId: string): Promise<void> {
			await this.loadActiveWorkflows();

			let data: IWorkflowDb | undefined;
			try {
				data = await this.workflowsStore.fetchWorkflow(workflowId);
			} catch (error) {
				this.showError(error, this.$locale.baseText('nodeView.showError.openWorkflow.title'));
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

			void this.$externalHooks().run('workflow.open', { workflowId, workflowName: data.name });
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
			await this.workflowsStore.fetchActiveWorkflows();
		},
		async onRetryExecution(payload: { execution: IExecutionsSummary; command: string }) {
			const loadWorkflow = payload.command === 'current-workflow';

			this.showMessage({
				title: this.$locale.baseText('executionDetails.runningMessage'),
				type: 'info',
				duration: 2000,
			});
			await this.retryExecution(payload.execution, loadWorkflow);
			await this.loadAutoRefresh();

			this.$telemetry.track('User clicked retry execution button', {
				workflow_id: this.workflowsStore.workflowId,
				execution_id: payload.execution.id,
				retry_type: loadWorkflow ? 'current' : 'original',
			});
		},
		async retryExecution(execution: IExecutionsSummary, loadWorkflow?: boolean) {
			try {
				const retrySuccessful = await this.workflowsStore.retryExecution(
					execution.id,
					loadWorkflow,
				);

				if (retrySuccessful === true) {
					this.showMessage({
						title: this.$locale.baseText('executionsList.showMessage.retrySuccessfulTrue.title'),
						type: 'success',
					});
				} else {
					this.showMessage({
						title: this.$locale.baseText('executionsList.showMessage.retrySuccessfulFalse.title'),
						type: 'error',
					});
				}
			} catch (error) {
				this.showError(
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
	width: 100%;
}

.content {
	flex: 1;
}
</style>
