<template>
	<n8n-info-accordion
		:class="[$style.accordion, 'mt-2xl']"
		:title="$locale.baseText('executionsLandingPage.emptyState.accordion.title')"
		:items="accordionItems"
		:initiallyExpanded="shouldExpandAccordion"
		:headerIcon="accordionIcon"
		@click="onAccordionClick"
		@tooltipClick="onItemTooltipClick"
	>
		<template #customContent>
			<footer class="mt-2xs">
				{{ $locale.baseText('executionsLandingPage.emptyState.accordion.footer') }}
				<n8n-tooltip :disabled="!isNewWorkflow">
					<template #content>
						<div>
							<n8n-link @click.prevent="onSaveWorkflowClick">{{
								$locale.baseText('executionsLandingPage.emptyState.accordion.footer.tooltipLink')
							}}</n8n-link>
							{{
								$locale.baseText('executionsLandingPage.emptyState.accordion.footer.tooltipText')
							}}
						</div>
					</template>
					<n8n-link
						@click.prevent="openWorkflowSettings"
						:class="{ [$style.disabled]: isNewWorkflow }"
						size="small"
					>
						{{ $locale.baseText('executionsLandingPage.emptyState.accordion.footer.settingsLink') }}
					</n8n-link>
				</n8n-tooltip>
			</footer>
		</template>
	</n8n-info-accordion>
</template>

<script lang="ts">
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import type { IWorkflowSettings } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { workflowHelpers } from '@/mixins/workflowHelpers';

interface IWorkflowSaveSettings {
	saveFailedExecutions: boolean;
	saveSuccessfulExecutions: boolean;
	saveTestExecutions: boolean;
}

export default mixins(workflowHelpers).extend({
	name: 'executions-info-accordion',
	props: {
		initiallyExpanded: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			defaultValues: {
				saveFailedExecutions: 'all',
				saveSuccessfulExecutions: 'all',
				saveManualExecutions: false,
			},
			workflowSaveSettings: {
				saveFailedExecutions: false,
				saveSuccessfulExecutions: false,
				saveTestExecutions: false,
			} as IWorkflowSaveSettings,
		};
	},
	mounted() {
		this.defaultValues.saveFailedExecutions = this.settingsStore.saveDataErrorExecution;
		this.defaultValues.saveSuccessfulExecutions = this.settingsStore.saveDataSuccessExecution;
		this.defaultValues.saveManualExecutions = this.settingsStore.saveManualExecutions;
		this.updateSettings(this.workflowSettings);
	},
	watch: {
		workflowSettings(newSettings: IWorkflowSettings) {
			this.updateSettings(newSettings);
		},
	},
	computed: {
		...mapStores(useRootStore, useSettingsStore, useUIStore, useWorkflowsStore),
		accordionItems(): Object[] {
			return [
				{
					id: 'productionExecutions',
					label: this.$locale.baseText(
						'executionsLandingPage.emptyState.accordion.productionExecutions',
					),
					icon: this.productionExecutionsIcon.icon,
					iconColor: this.productionExecutionsIcon.color,
					tooltip:
						this.productionExecutionsStatus === 'unknown'
							? this.$locale.baseText(
									'executionsLandingPage.emptyState.accordion.productionExecutionsWarningTooltip',
							  )
							: null,
				},
				{
					id: 'manualExecutions',
					label: this.$locale.baseText('executionsLandingPage.emptyState.accordion.testExecutions'),
					icon: this.workflowSaveSettings.saveTestExecutions ? 'check' : 'times',
					iconColor: this.workflowSaveSettings.saveTestExecutions ? 'success' : 'danger',
				},
			];
		},
		shouldExpandAccordion(): boolean {
			if (this.initiallyExpanded === false) {
				return false;
			}
			return (
				!this.workflowSaveSettings.saveFailedExecutions ||
				!this.workflowSaveSettings.saveSuccessfulExecutions ||
				!this.workflowSaveSettings.saveTestExecutions
			);
		},
		productionExecutionsIcon(): { icon: string; color: string } {
			if (this.productionExecutionsStatus === 'saving') {
				return { icon: 'check', color: 'success' };
			} else if (this.productionExecutionsStatus === 'not-saving') {
				return { icon: 'times', color: 'danger' };
			}
			return { icon: 'exclamation-triangle', color: 'warning' };
		},
		productionExecutionsStatus(): string {
			if (
				this.workflowSaveSettings.saveSuccessfulExecutions ===
				this.workflowSaveSettings.saveFailedExecutions
			) {
				if (this.workflowSaveSettings.saveSuccessfulExecutions) {
					return 'saving';
				}
				return 'not-saving';
			} else {
				return 'unknown';
			}
		},
		workflowSettings(): IWorkflowSettings {
			const workflowSettings = deepCopy(this.workflowsStore.workflowSettings);
			return workflowSettings;
		},
		accordionIcon(): { icon: string; color: string } | null {
			if (
				!this.workflowSaveSettings.saveTestExecutions ||
				this.productionExecutionsStatus !== 'saving'
			) {
				return { icon: 'exclamation-triangle', color: 'warning' };
			}
			return null;
		},
		currentWorkflowId(): string {
			return this.workflowsStore.workflowId;
		},
		isNewWorkflow(): boolean {
			return (
				!this.currentWorkflowId ||
				this.currentWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
				this.currentWorkflowId === 'new'
			);
		},
		workflowName(): string {
			return this.workflowsStore.workflowName;
		},
		currentWorkflowTagIds(): string[] {
			return this.workflowsStore.workflowTags;
		},
	},
	methods: {
		updateSettings(workflowSettings: IWorkflowSettings): void {
			this.workflowSaveSettings.saveFailedExecutions =
				workflowSettings.saveDataErrorExecution === undefined
					? this.defaultValues.saveFailedExecutions === 'all'
					: workflowSettings.saveDataErrorExecution === 'all';
			this.workflowSaveSettings.saveSuccessfulExecutions =
				workflowSettings.saveDataSuccessExecution === undefined
					? this.defaultValues.saveSuccessfulExecutions === 'all'
					: workflowSettings.saveDataSuccessExecution === 'all';
			this.workflowSaveSettings.saveTestExecutions =
				workflowSettings.saveManualExecutions === undefined
					? this.defaultValues.saveManualExecutions
					: (workflowSettings.saveManualExecutions as boolean);
		},
		onAccordionClick(event: MouseEvent): void {
			if (event.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			}
		},
		onItemTooltipClick(item: string, event: MouseEvent): void {
			if (item === 'productionExecutions' && event.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			}
		},
		openWorkflowSettings(event: MouseEvent): void {
			this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
		},
		async onSaveWorkflowClick(event: MouseEvent): void {
			let currentId = undefined;
			if (this.currentWorkflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				currentId = this.currentWorkflowId;
			} else if (this.$route.params.name && this.$route.params.name !== 'new') {
				currentId = this.$route.params.name;
			}
			const saved = await this.saveCurrentWorkflow({
				id: currentId,
				name: this.workflowName,
				tags: this.currentWorkflowTagIds,
			});
			if (saved) this.settingsStore.fetchPromptsData();
		},
	},
});
</script>

<style module lang="scss">
.accordion {
	background: none;
	width: 320px;

	// Accordion header
	& > div:nth-child(1) {
		display: flex;
		flex-direction: row;
		padding: var(--spacing-xs);
		width: 100%;
		user-select: none;
		color: var(--color-text-base) !important;
	}

	// Accordion description
	& > div:nth-child(2) {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 0 var(--spacing-l) var(--spacing-s) !important;

		span {
			width: 100%;
		}
	}

	footer {
		text-align: left;
		width: 100%;
		font-size: var(--font-size-2xs);
	}

	.disabled a {
		color: currentColor;
		cursor: not-allowed;
		opacity: 0.5;
		text-decoration: none;
	}
}
</style>
