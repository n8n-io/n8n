<template>
	<div v-if="executionUIDetails && executionUIDetails.name === 'running'" :class="$style.runningInfo">
		<div :class="$style.spinner">
			<font-awesome-icon icon="spinner" spin />
		</div>
		<n8n-text :class="$style.runningMessage">
			{{ $locale.baseText('executionDetails.runningMessage') }}
		</n8n-text>
	</div>
	<div v-else :class="$style.previewContainer">
		<div :class="$style.executionDetails" v-if="activeExecution">
			<n8n-text size="medium" color="text-base" :bold="true">{{ executionUIDetails.startTime }}</n8n-text><br>
			<n8n-spinner v-if="executionUIDetails.name === 'running'" size="small" :class="[$style.spinner, 'mr-4xs']"/>
			<n8n-text size="small" :class="[$style.status, $style[executionUIDetails.name]]">{{ executionUIDetails.label }}</n8n-text>
			<n8n-text v-if="executionUIDetails.name === 'running'" color="text-base" size="small">
				{{ $locale.baseText('executionDetails.runningTimeRunning', { interpolate: { time: executionUIDetails.runningTime } }) }} | ID#{{ activeExecution.id }}
			</n8n-text>
			<n8n-text v-else-if="executionUIDetails.name !== 'waiting'" color="text-base" size="small">
				{{ $locale.baseText('executionDetails.runningTimeFinished', { interpolate: { time: executionUIDetails.runningTime } }) }} | ID#{{ activeExecution.id }}
			</n8n-text>
			<br><n8n-text v-if="activeExecution.mode === 'retry'" color="text-base" size= "small">
				{{ $locale.baseText('executionDetails.retry') }}
				<router-link
					:class="$style.executionLink"
					:to="{ name: VIEWS.EXECUTION_PREVIEW, params: { workflowId: activeExecution.workflowId, executionId: activeExecution.retryOf }}"
				>
					#{{ activeExecution.retryOf }}
				</router-link>
			</n8n-text>
		</div>
		<workflow-preview mode="execution" loaderType="spinner" :executionId="executionId"/>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { executionHelpers, IExecutionUIData } from '../mixins/executionsHelpers';
import { VIEWS } from '../../constants';

export default mixins(restApi, showMessage, executionHelpers).extend({
	name: 'execution-preview',
	components: {
		WorkflowPreview,
	},
	data() {
		return {
			VIEWS,
		};
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
		executionUIDetails(): IExecutionUIData | null {
			return this.activeExecution ? this.getExecutionUIDetails(this.activeExecution) : null;
		},
	},
	methods: {
		syncActiveExecution() : void {
			const execution = this.$store.getters['workflows/getExecutionDataById'](this.executionId);
			if (execution) {
				this.$store.commit('workflows/setActiveWorkflowExecution', execution);
			}
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

.unknown, .running, .spinner { color: var(--color-warning); }
.waiting { color: var(--color-secondary); }
.success { color: var(--color-success); }
.error { color: var(--color-danger); }

.runningInfo {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing-4xl);
}

.spinner {
	font-size: var(--font-size-2xl);
	color: var(--color-primary);
}

.runningMessage {
	width: 200px;
	margin-top: var(--spacing-l);
	text-align: center;
}
</style>
