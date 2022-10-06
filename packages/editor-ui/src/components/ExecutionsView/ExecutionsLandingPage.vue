<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div v-if="executionCount === 0" :class="[$style.messageContainer, $style.noExecutionsMessage]">
			<div v-if="!containsTrigger">
				<n8n-heading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ $locale.baseText('executionsLandingPage.emptyState.noTrigger.heading') }}
				</n8n-heading>
				<n8n-text size="small">
					{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
				</n8n-text>
				<n8n-button class="mt-l" type="tertiary" @click="onSetupTriggerButtonClick">
					{{ $locale.baseText('executionsLandingPage.emptyState.noTrigger.buttonText') }}
				</n8n-button>
			</div>
			<div v-else>
				<n8n-heading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ $locale.baseText('executionsLandingPage.emptyState.heading') }}
				</n8n-heading>
				<n8n-text size="small">
					{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
				</n8n-text>
				<n8n-button class="mt-l" type="tertiary" @click="onExecuteWorkflowButtonClick">
					{{ $locale.baseText('nodeView.runButtonText.executeWorkflow') }}
				</n8n-button>
				<n8n-info-accordion
					:class="[$style.accordion, 'mt-2xl']"
					title="Which executions is this workflow saving?"
					:items="accordionItems"
					:description="accordionDescription"
					:initiallyExpanded="shouldExpandAccordion"
					@click="onAccordionClick"
				></n8n-info-accordion>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { IExecutionsSummary } from '@/Interface';
import { IWorkflowSettings } from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { getActivatableTriggerNodes } from '../helpers';
import { restApi } from '../mixins/restApi';

interface IWorkflowSaveSettings {
	saveFailedExecutions: boolean,
	saveSuccessfulExecutions: boolean,
	saveManualExecutions: boolean,
};

export default mixins(restApi).extend({
	name: 'executions-landing-page',
	data() {
		return {
			workflowSaveSettings: {
				saveFailedExecutions: false,
				saveSuccessfulExecutions: false,
				saveManualExecutions: false,
			} as IWorkflowSaveSettings,
		};
	},
	computed: {
		executionCount(): number {
			return (this.$store.getters['workflows/currentWorkflowExecutions'] as IExecutionsSummary[]).length;
		},
		containsTrigger(): boolean {
			if (this.currentWorkflowId === '' || this.currentWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				return false;
			}
			const foundTriggers = getActivatableTriggerNodes(this.$store.getters.workflowTriggerNodes);
			return foundTriggers.length > 0;
		},
		currentWorkflowId(): string {
			return this.$store.getters.workflowId;
		},
		workflowSettings(): IWorkflowSettings {
			const workflowSettings = JSON.parse(JSON.stringify(this.$store.getters.workflowSettings)) as IWorkflowSettings;
			return workflowSettings;
		},
		accordionItems(): Object[] {
			return [
				{
					id: 'successfulExecutions',
					label: this.$locale.baseText('executionsLandingPage.emptyState.accordion.successfulExecutions'),
					icon: this.workflowSaveSettings.saveSuccessfulExecutions ? 'check' : 'times',
					iconColor: this.workflowSaveSettings.saveSuccessfulExecutions ? 'success' : 'danger',
				},
				{
					id: 'failedExecutions',
					label: this.$locale.baseText('executionsLandingPage.emptyState.accordion.failedExecutions'),
					icon: this.workflowSaveSettings.saveFailedExecutions ? 'check' : 'times',
					iconColor: this.workflowSaveSettings.saveFailedExecutions ? 'success' : 'danger',
				},
				{
					id: 'manualExecutions',
					label: this.$locale.baseText('executionsLandingPage.emptyState.accordion.manualExecutions'),
					icon: this.workflowSaveSettings.saveManualExecutions ? 'check' : 'times',
					iconColor: this.workflowSaveSettings.saveManualExecutions ? 'success' : 'danger',
				},
			];
		},
		accordionDescription(): string {
			return `
				<footer class="mt-2xs">
					${this.$locale.baseText('executionsLandingPage.emptyState.accordion.footer')}
				</footer>
			`;
		},
		shouldExpandAccordion(): boolean {
			return this.workflowSaveSettings.saveFailedExecutions === false ||
				this.workflowSaveSettings.saveSuccessfulExecutions === false ||
				this.workflowSaveSettings.saveManualExecutions === false;
		},
	},
	mounted() {
		this.updateSettings(this.workflowSettings);
	},
	watch: {
		workflowSettings(newSettings: IWorkflowSettings) {
			this.updateSettings(newSettings);
		},
	},
	methods: {
		onSetupTriggerButtonClick(event: MouseEvent): void {
			const workflowRoute = this.getWorkflowRoute();
			this.$router.push(workflowRoute);
		},
		onExecuteWorkflowButtonClick(event: MouseEvent): void {
			const workflowRoute = this.getWorkflowRoute();
			this.$router.push({ name: workflowRoute.name, params: { ...workflowRoute.params, animateButton: 'true' } });
		},
		getWorkflowRoute(): { name: string, params: {}} {
			const workflowId = this.currentWorkflowId || this.$route.params.name;
			if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				return { name: VIEWS.NEW_WORKFLOW, params: {} };
			} else {
				return { name: VIEWS.WORKFLOW, params: { name: workflowId } };
			}
		},
		updateSettings(settingsInStore: IWorkflowSettings): void {
			this.workflowSaveSettings.saveFailedExecutions = settingsInStore.saveDataErrorExecution !== 'none';
			this.workflowSaveSettings.saveSuccessfulExecutions = settingsInStore.saveDataSuccessExecution !== 'none';
			this.workflowSaveSettings.saveManualExecutions = settingsInStore.saveManualExecutions !== false;
		},
		onAccordionClick(event: MouseEvent): void {
			if (event.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
			}
		},
	},
});
</script>

<style module lang="scss">

.container {
	width: 100%;
	height: 100%;
	flex: 1;
	background-color: var(--color-background-light);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.messageContainer {
	margin-top: var(--spacing-4xl);
	color: var(--color-text-base);

	div {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
}

.icon {
	font-size: 24px;
	color: var(--color-foreground-dark);
}

.accordion {
	background: none;
	width: 320px;

	// Accordion header
	& > div:nth-child(1) {
		display: flex;
		flex-direction: row;
		padding: 0;
		width: 100%;
	}

	// Accordion description
	& > div:nth-child(2) {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: var(--spacing-s) !important;

		span { width: 100%; }
	}

	footer {
		text-align: left;
		width: 100%;
	}
}

</style>
