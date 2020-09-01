<template>
	<div>
		<div class="main-header">
			<input type="file" ref="importFile" style="display: none" v-on:change="handleFileImport()">

			<div class="top-menu">
				<div class="center-item">
					<span v-if="isExecutionPage">
						Execution Id:
						<span v-if="isExecutionPage" class="execution-name">
							<strong>{{executionId}}</strong>&nbsp;
							<font-awesome-icon icon="check" class="execution-icon success" v-if="executionFinished" title="Execution was successful" />
							<font-awesome-icon icon="times" class="execution-icon error" v-else title="Execution did fail" />
						</span>
							of
						<span class="workflow-name clickable" title="Open Workflow">
							<span @click="openWorkflow(workflowExecution.workflowId)">"{{workflowName}}"</span>
						</span>
						workflow
					</span>
					<span index="workflow-name" class="current-workflow" v-if="!isReadOnly">
						<span v-if="currentWorkflow">Workflow: <span class="workflow-name">{{workflowName}}</span></span>
						<span v-else class="workflow-not-saved">Workflow was not saved!</span>
					</span>

					<span class="saving-workflow" v-if="isWorkflowSaving">
						<font-awesome-icon icon="spinner" spin />
						Saving...
					</span>

				</div>

				<div class="push-connection-lost" v-if="!isPushConnectionActive">
					<el-tooltip placement="bottom-end" effect="light">
						<div slot="content">
							Cannot connect to server.<br />
							It is either down or you have a connection issue. <br />
							It should reconnect automatically once the issue is resolved.
						</div>
						<span>
							<font-awesome-icon icon="exclamation-triangle" />&nbsp;
							Connection lost
						</span>
					</el-tooltip>
				</div>
				<div class="workflow-active" v-else-if="!isReadOnly">
					Active:
					<workflow-activator :workflow-active="isWorkflowActive" :workflow-id="currentWorkflow" :disabled="!currentWorkflow"/>
				</div>

				<div class="read-only" v-if="isReadOnly">
					<el-tooltip placement="bottom-end" effect="light">
						<div slot="content">
							You're viewing the log of a previous execution. You cannot<br />
							make changes since this execution already occured. Make changes<br /> to this workflow by clicking on it`s name on the left.
						</div>
						<span>
							<font-awesome-icon icon="exclamation-triangle" />
							Read only
						</span>
					</el-tooltip>
				</div>

			</div>

		</div>

	</div>

</template>

<script lang="ts">
import Vue from 'vue';

import {
	IExecutionResponse,
	IExecutionsStopData,
	IWorkflowDataUpdate,
} from '../Interface';

import WorkflowActivator from '@/components/WorkflowActivator.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { pushConnection } from '@/components/mixins/pushConnection';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { titleChange } from '@/components/mixins/titleChange';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import { saveAs } from 'file-saver';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	pushConnection,
	restApi,
	showMessage,
	titleChange,
	workflowHelpers,
)
	.extend({
		name: 'MainHeader',
		components: {
			WorkflowActivator,
		},
		computed: {
			executionId (): string | undefined {
				return this.$route.params.id;
			},
			executionFinished (): boolean {
				if (!this.isExecutionPage) {
					// We are not on an execution page so return false
					return false;
				}

				const fullExecution = this.$store.getters.getWorkflowExecution;

				if (fullExecution === null) {
					// No execution loaded so return also false
					return false;
				}

				if (fullExecution.finished === true) {
					return true;
				}

				return false;
			},
			isExecutionPage (): boolean {
				if (['ExecutionById'].includes(this.$route.name as string)) {
					return true;
				}
				return false;
			},
			isPushConnectionActive (): boolean {
				return this.$store.getters.pushConnectionActive;
			},
			isWorkflowActive (): boolean {
				return this.$store.getters.isActive;
			},
			isWorkflowSaving (): boolean {
				return this.$store.getters.isActionActive('workflowSaving');
			},
			currentWorkflow (): string {
				return this.$route.params.name;
			},
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			workflowName (): string {
				return this.$store.getters.workflowName;
			},
			workflowRunning (): boolean {
				return this.$store.getters.isActionActive('workflowRunning');
			},
			isDirty () : boolean {
				return this.$store.getters.getStateIsDirty;
			},
		},
		methods: {
			async openWorkflow (workflowId: string) {
				this.$titleSet(this.workflowName, 'IDLE');
				// Change to other workflow
				this.$router.push({
					name: 'NodeViewExisting',
					params: { name: workflowId },
				});
			},
		},
		async mounted () {
			// Initialize the push connection
			this.pushConnect();
		},
		beforeDestroy () {
			this.pushDisconnect();
		},
	});
</script>

<style lang="scss">
.el-menu--horizontal>.el-menu-item,
.el-menu--horizontal>.el-submenu .el-submenu__title,
.el-menu-item {
	height: 65px;
	line-height: 65px;
}

.el-submenu .el-submenu__title,
.el-menu--horizontal>.el-menu-item,
.el-menu.el-menu--horizontal {
	border: none !important;
}
.el-menu--popup-bottom-start {
	margin-top: 0px;
	border-top: 1px solid #464646;
	border-radius: 0 0 2px 2px;
}

.main-header {
	position: fixed;
	top: 0;
	background-color: #fff;
	height: 65px;
	width: 100%;
}

.top-menu {
	position: relative;
	font-size: 0.9em;
	width: 100%;
	font-weight: 400;

	.center-item {
		margin: 0 auto;
		text-align: center;
		line-height: 65px;

		.saving-workflow {
			display: inline-block;
			margin-left: 2em;
			padding: 0 15px;
			color: $--color-primary;
			background-color: $--color-primary-light;
			line-height: 30px;
			height: 30px;
			border-radius: 15px;
		}
	}

	.read-only {
		position: absolute;
		top: 0;
		line-height: 65px;
		margin-right: 5em;
		right: 0;
		color: $--color-primary;
	}

	.push-connection-lost {
		position: absolute;
		top: 0;
		line-height: 65px;
		margin-right: 5em;
		right: 0;
		color: $--color-primary;
	}

	.workflow-active {
		position: absolute;
		top: 0;
		line-height: 65px;
		margin-right: 5em;
		right: 0;
	}

	.workflow-name {
		color: $--color-primary;
	}
}

</style>

<style scoped lang="scss">

.current-execution,
.current-workflow {
	vertical-align: top;
}

.execution-icon.error,
.workflow-not-saved {
	color: #FF2244;
}

.execution-icon.success {
	color: #22FF44;
}

.menu-separator-bottom {
	border-bottom: 1px solid #707070;
}

.menu-separator-top {
	border-top: 1px solid #707070;
}

</style>
