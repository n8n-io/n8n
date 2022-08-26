<template>
	<NodeView
		ref="canvas"
	/>
</template>

<script lang="ts">
import { canvasUtils } from '@/components/mixins/canvasUtils';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { IExecutionResponse, IExecutionsSummary } from '@/Interface';
import Vue from 'vue';
import { Route } from 'vue-router';
import mixins from 'vue-typed-mixins';
import NodeView from './NodeView.vue';

export default mixins(showMessage, restApi, canvasUtils).extend({
	components: {
		NodeView,
	},
	data() {
		return {
			loading: false,
			executionResponse: null as null | IExecutionResponse,
		};
	},
	mounted() {
		const executionId = this.$route.params.id;
		this.openExecution(executionId);
	},
	methods: {
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

			this.executionResponse = data;

			this.$store.commit('setWorkflowName', {newName: data.workflowData.name, setStateDirty: false});
			this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);

			await this.addNodesToCanvas(JSON.parse(JSON.stringify(this.executionResponse.workflowData.nodes)));

			await Vue.nextTick();

			if (this.$refs.canvas) {
				const connections = JSON.parse(JSON.stringify(this.executionResponse.workflowData.connections));
				(this.$refs.canvas as Vue).$emit('addConnectionsToCanvas', connections);
			}

			this.$store.commit('setWorkflowExecutionData', data);
			this.$store.commit('setWorkflowPinData', data.workflowData.pinData);

			await Vue.nextTick();
			this.$store.commit('setStateDirty', false);
			if (this.$refs.canvas) {
				(this.$refs.canvas as Vue).$emit('zoomToFit');
			}

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
		$route(route: Route) {
			if (route.name === VIEWS.EXECUTION) {
				if (this.$refs.canvas) {
					(this.$refs.canvas as Vue).$emit('resetWorkspace');
				}

				const executionId = this.$route.params.id;
				this.openExecution(executionId);
			}
		},
	},
});
</script>
