<template>
	<div :class="$style.previewContainer">
		<div :class="$style.executionDetails" v-if="activeExecution">
			<n8n-text size="medium" color="text-base" :bold="true">{{ executionUIDetails.startTime }}</n8n-text><br>
			<n8n-text size="small" :class="[$style.status, $style[executionUIDetails.name]]">{{ executionUIDetails.label }}</n8n-text>
			<n8n-text size="small" color="text-light"> in {{ runningTime }} | ID#{{ activeExecution.id }}</n8n-text>
		</div>
		<workflow-preview mode="execution" loaderType="spinner" :executionId="executionId"/>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { IExecutionsSummary } from '@/Interface';
import { genericHelpers } from '../mixins/genericHelpers';
import dateFormat from 'dateformat';

interface IExecutionUIData {
	name: string;
	label: string;
	startTime: string,
	runningTime: string;
}

export default mixins(restApi, showMessage, genericHelpers).extend({
	name: 'execution-preview',
	components: {
		WorkflowPreview,
	},
	mounted() {
		this.syncActiveExecution();
	},
	watch: {
		'$route.params.executionId' (newValue) {
			this.syncActiveExecution();
		},
		currentWorkflowExecutions(newValue) {
			this.syncActiveExecution();
		},
	},
	computed: {
		executionId(): string {
			return this.$route.params.executionId;
		},
		currentWorkflowExecutions(): IExecutionsSummary[] {
			return this.$store.getters['workflows/currentWorkflowExecutions'];
		},
		activeExecution(): IExecutionsSummary {
			return this.$store.getters['workflows/getActiveWorkflowExecution'];
		},
		executionUIDetails(): IExecutionUIData {
			const status: IExecutionUIData = {
				name: 'unknown',
				label: 'Status unknown',
				startTime: this.formatDate(new Date(this.activeExecution.startedAt)),
				runningTime: this.runningTime,
			};

			if (this.activeExecution.waitTill) {
				status.name = 'waiting';
				status.label = 'Waiting';
			} else if (this.activeExecution.stoppedAt === undefined) {
				status.name = 'running';
				status.label = 'Running';
			} else if (this.activeExecution.finished) {
				status.name = 'success';
				status.label = 'Succeeded';
			} else if (this.activeExecution.stoppedAt !== null) {
				status.name = 'error';
				status.label = 'Failed';
			}

			return status;
		},
		runningTime(): string {
			if (this.activeExecution.stoppedAt) {
				return this.displayTimer(new Date(this.activeExecution.stoppedAt).getTime() - new Date(this.activeExecution.startedAt).getTime(), true);
			}
			return '';
		},
	},
	methods: {
		syncActiveExecution() : void {
			const execution = this.$store.getters['workflows/getExecutionDataById'](this.executionId);
			if (execution) {
				this.$store.commit('workflows/setActiveWorkflowExecution', execution);
			}
		},
		formatDate(date: Date) {
			return dateFormat(date.getTime(), 'HH:MM:ss "on" d mmmm');
		},
	},
});
</script>

<style module lang="scss">

.previewContainer {
	height: 100%;
	overflow: hidden;
}

.executionDetails {
	position: absolute;
	padding: var(--spacing-m);
}

.unknown, .waiting, .running { color: var(--color-warning); }
.success { color: var(--color-success); }
.error { color: var(--color-danger); }
</style>
