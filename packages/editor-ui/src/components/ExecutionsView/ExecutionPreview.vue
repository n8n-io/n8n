<template>
	<div :class="$style.previewContainer">
		<div :class="$style.executionDetails" v-if="activeExecution">
			<n8n-text size="medium" color="text-base" :bold="true">{{ executionUIDetails.startTime }}</n8n-text><br>
			<n8n-text size="small" :class="[$style.status, $style[executionUIDetails.name]]">{{ executionUIDetails.label }}</n8n-text>
			<n8n-text size="small" color="text-light"> in {{ executionUIDetails.runningTime }} | ID#{{ activeExecution.id }}</n8n-text>
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

export default mixins(restApi, showMessage, executionHelpers).extend({
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
		executionUIDetails(): IExecutionUIData {
			return this.getExecutionUIDetails(this.activeExecution);
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

.unknown, .waiting, .running { color: var(--color-warning); }
.success { color: var(--color-success); }
.error { color: var(--color-danger); }
</style>
