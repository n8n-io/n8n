
<template>
	<NodeView
		ref="canvas"
		@ready="initView"
	/>
</template>

<script lang="ts">
import NodeView from './NodeView.vue';
import { canvasUtils } from '@/components/mixins/canvasUtils';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { MODAL_CLOSE, MODAL_CONFIRMED, PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { IExecutionResponse, IExecutionsSummary, INodeUi, ITag, IWorkflowDb, IWorkflowTemplate } from '@/Interface';
import { v4 as uuid } from 'uuid';
import mixins from 'vue-typed-mixins';

import Vue from 'vue';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { titleChange } from '@/components/mixins/titleChange';
import { IConnections } from 'n8n-workflow';

import * as CanvasHelpers from './canvasHelpers';

export default mixins(showMessage, restApi, canvasUtils, workflowHelpers, titleChange).extend({
	components: {
		NodeView,
	},
	data() {
		return {
			VIEWS,
			loading: false,
			blankRedirect: false,
		};
	},
	computed: {
		pageName(): string {
			return this.$route.name || '';
		},
	},
	methods: {
		resetWorkspace() {
			const canvas = this.$refs.canvas;
			if (canvas) {
				(canvas as Vue).$emit('resetWorkspace');
			}
		},
		zoomToFit() {
			const canvas = this.$refs.canvas;
			if (canvas) {
				(canvas as Vue).$emit('zoomToFit');
			}
		},
		setZoomLevel(level: number) {
			const canvas = this.$refs.canvas;
			if (canvas) {
				(canvas as Vue).$emit('setZoomLevel', level);
			}
		},
		addConnectionsToCanvas(connections: IConnections) {
			const canvas = this.$refs.canvas;
			if (canvas) {
				(canvas as Vue).$emit('addConnectionsToCanvas', connections);
			}
		},
		selectNodeByName(name: string) {
			const canvas = this.$refs.canvas;
			if (canvas) {
				(canvas as Vue).$emit('selectNodeByName', name);
			}
		},
		async addNodes (nodes: INodeUi[], connections?: IConnections) {
			if (!nodes || !nodes.length) {
				return;
			}

			await this.addNodesToCanvas(nodes);

			// Wait for the node to be rendered
			await Vue.nextTick();

			if (connections) {
				this.addConnectionsToCanvas(connections);
			}
		},

		async initView () {
			if (this.$route.params.action === 'workflowSave') {
				// In case the workflow got saved we do not have to run init
				// as only the route changed but all the needed data is already loaded
				this.$store.commit('setStateDirty', false);
				return Promise.resolve();
			}

			if (this.blankRedirect) {
				this.blankRedirect = false;
			}
			else if (this.$route.name === VIEWS.EXECUTION) {
				const executionId = this.$route.params.id;
				this.openExecution(executionId);
			}
			else if (this.$route.name === VIEWS.TEMPLATE_IMPORT) {
				const templateId = this.$route.params.id;
				await this.openWorkflowTemplate(templateId);
			} else {

				const result = this.$store.getters.getStateIsDirty;
				if(result) {
					const confirmModal = await this.confirmModal(
						this.$locale.baseText('nodeView.confirmMessage.initView.message'),
						this.$locale.baseText('nodeView.confirmMessage.initView.headline'),
						'warning',
						this.$locale.baseText('nodeView.confirmMessage.initView.confirmButtonText'),
						this.$locale.baseText('nodeView.confirmMessage.initView.cancelButtonText'),
						true,
					);

					if (confirmModal === MODAL_CONFIRMED) {
						const saved = await this.saveCurrentWorkflow();
						if (saved) this.$store.dispatch('settings/fetchPromptsData');
					} else if (confirmModal === MODAL_CLOSE) {
						return Promise.resolve();
					}
				}

				// Load a workflow
				let workflowId = null as string | null;
				if (this.$route.params.name) {
					workflowId = this.$route.params.name;
				}
				if (workflowId !== null) {
					const workflow = await this.restApi().getWorkflow(workflowId);
					if (!workflow) {
						this.$router.push({
							name: VIEWS.NEW_WORKFLOW,
						});
						this.$showMessage({
							title: 'Error',
							message: this.$locale.baseText('openWorkflow.workflowNotFoundError'),
							type: 'error',
						});
					} else {
						this.$titleSet(workflow.name, 'IDLE');
						// Open existing workflow
						await this.openWorkflow(workflowId);
					}
				} else {
					// Create new workflow
					await this.newWorkflow();
				}
			}
		},
		async openWorkflowTemplate (templateId: string) {
			this.setLoadingText(this.$locale.baseText('nodeView.loadingTemplate'));
			this.resetWorkspace();

			let data: IWorkflowTemplate | undefined;
			try {
				this.$externalHooks().run('template.requested', { templateId });
				data = await this.$store.dispatch('templates/getWorkflowTemplate', templateId);

				if (!data) {
					throw new Error(
						this.$locale.baseText(
							'nodeView.workflowTemplateWithIdCouldNotBeFound',
							{ interpolate: { templateId } },
						),
					);
				}
			} catch (error) {
				this.$showError(error, this.$locale.baseText('nodeView.couldntImportWorkflow'));
				this.$router.replace({ name: VIEWS.NEW_WORKFLOW });
				return;
			}

			data.workflow.nodes = CanvasHelpers.getFixedNodesList(data.workflow.nodes);

			this.blankRedirect = true;
			this.$router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

			await this.addNodes(data.workflow.nodes, data.workflow.connections);
			await this.$store.dispatch('workflows/getNewWorkflowData', data.name);
			this.$nextTick(() => {
				this.zoomToFit();
				this.$store.commit('setStateDirty', true);
			});

			this.$externalHooks().run('template.open', { templateId, templateName: data.name, workflow: data.workflow });
		},
		async openWorkflow (workflowId: string) {
			this.resetWorkspace();

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

			this.$store.commit('setActive', data.active || false);
			this.$store.commit('setWorkflowId', workflowId);
			this.$store.commit('setWorkflowName', {newName: data.name, setStateDirty: false});
			this.$store.commit('setWorkflowSettings', data.settings || {});
			this.$store.commit('setWorkflowPinData', data.pinData || {});

			const tags = (data.tags || []) as ITag[];
			this.$store.commit('tags/upsertTags', tags);

			const tagIds = tags.map((tag) => tag.id);
			this.$store.commit('setWorkflowTagIds', tagIds || []);

			await this.addNodes(data.nodes, data.connections);
			if (!this.credentialsUpdated) {
				this.$store.commit('setStateDirty', false);
			}

			this.zoomToFit();

			this.$externalHooks().run('workflow.open', { workflowId, workflowName: data.name });

			return data;
		},
		async newWorkflow (): Promise<void> {
			await this.resetWorkspace();
			const newWorkflow = await this.$store.dispatch('workflows/getNewWorkflowData');

			this.$store.commit('setStateDirty', false);

			await this.addNodes([{
				id: uuid(),
				...CanvasHelpers.DEFAULT_START_NODE,
			}]);

			this.selectNodeByName(CanvasHelpers.DEFAULT_START_NODE.name);

			this.$store.commit('setStateDirty', false);

			this.setZoomLevel(1);

			if (
				window.posthog && window.featureFlag && window.posthog.getFeatureFlag &&
					!window.featureFlag.isEnabled('show-welcome-note')
			) {
				return;
			}

			setTimeout(() => {
				this.$store.commit('setNodeViewOffsetPosition', {newOffset: [0, 0]});
				// For novice users (onboardingFlowEnabled == true)
				// Inject welcome sticky note and zoom to fit
				if (newWorkflow.onboardingFlowEnabled && !this.isReadOnly) {
					this.$nextTick(async () => {
						await this.addNodes([
							{
								id: uuid(),
								...CanvasHelpers.WELCOME_STICKY_NODE,
								parameters: {
									// Use parameters from the template but add translated content
									...CanvasHelpers.WELCOME_STICKY_NODE.parameters,
									content: this.$locale.baseText('onboardingWorkflow.stickyContent'),
								},
							},
						]);
						this.zoomToFit();
						this.$telemetry.track('welcome note inserted');
					});
				}
			}, 0);
		},
		async openExecution (executionId: string) {
			let data: IExecutionResponse | undefined;
			try {
				this.loading = true;
				data = await this.restApi().getExecution(executionId);
				this.loading = false;
			} catch (error) {
				this.loading = false;
				this.$showError(
					error,
					this.$locale.baseText('nodeView.showError.openExecution.title'),
				);
				return;
			}

			if (data === undefined) {
				throw new Error(`Execution with id "${executionId}" could not be found!`);
			}

			this.$store.commit('setWorkflowName', {newName: data.workflowData.name, setStateDirty: false});
			this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);

			const nodes = JSON.parse(JSON.stringify(data.workflowData.nodes));
			const connections = JSON.parse(JSON.stringify(data.workflowData.connections));
			this.addNodes(nodes, connections);

			this.$store.commit('setWorkflowExecutionData', data);
			this.$store.commit('setWorkflowPinData', data.workflowData.pinData);

			await Vue.nextTick();
			this.$store.commit('setStateDirty', false);
			this.zoomToFit();

			this.$externalHooks().run('execution.open', { workflowId: data.workflowData.id, workflowName: data.workflowData.name, executionId });
			this.$telemetry.track('User opened read-only execution', { workflow_id: data.workflowData.id, execution_mode: data.mode, execution_finished: data.finished });

			if (data.finished !== true && data && data.data && data.data.resultData && data.data.resultData.error) {
				// Check if any node contains an error
				let nodeErrorFound = false;
				if (data.data.resultData.runData) {
					const runData = data.data.resultData.runData;
					errorCheck:
					for (const nodeName of Object.keys(runData)) {
						for (const taskData of runData[nodeName]) {
							if (taskData.error) {
								nodeErrorFound = true;
								break errorCheck;
							}
						}
					}
				}

				if (nodeErrorFound === false) {
					const resultError = data.data.resultData.error;
					const errorMessage = this.$getExecutionError(resultError);
					const shouldTrack = resultError && resultError.node && resultError.node.type.startsWith('n8n-nodes-base');
					this.$showMessage({
						title: 'Failed execution',
						message: errorMessage,
						type: 'error',
					}, shouldTrack);

					if (data.data.resultData.error.stack) {
						// Display some more information for now in console to make debugging easier
						// TODO: Improve this in the future by displaying in UI
						console.error(`Execution ${executionId} error:`); // eslint-disable-line no-console
						console.error(data.data.resultData.error.stack); // eslint-disable-line no-console
					}
				}
			}

			if ((data as IExecutionsSummary).waitTill) {
				this.$showMessage({
					title: this.$locale.baseText('nodeView.thisExecutionHasntFinishedYet'),
					message: `<a onclick="window.location.reload(false);">${this.$locale.baseText('nodeView.refresh')}</a> ${this.$locale.baseText('nodeView.toSeeTheLatestStatus')}.<br/> <a href="https://docs.n8n.io/nodes/n8n-nodes-base.wait/" target="_blank">${this.$locale.baseText('nodeView.moreInfo')}</a>`,
					type: 'warning',
					duration: 0,
				});
			}
		},
	},
	watch: {
		'$route': 'initView',
	},
});
</script>

<style>

</style>
