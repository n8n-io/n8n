<template>
	<div
		:class="{
			['execution-card']: true,
			[$style.executionCard]: true,
			[$style.active]: isActive,
			[$style[executionUIDetails.name]]: true,
			[$style.highlight]: highlight,
		}"
	>
		<router-link
			:class="$style.executionLink"
			:to="{ name: VIEWS.EXECUTION_PREVIEW, params: { workflowId: currentWorkflow, executionId: execution.id }}"
		>
			<div :class="$style.description">
				<n8n-text color="text-dark" :bold="true" size="medium">{{ executionUIDetails.startTime }}</n8n-text>
				<div :class="$style.executionStatus">
					<n8n-spinner v-if="executionUIDetails.name === 'running'" size="small" :class="[$style.spinner, 'mr-4xs']"/>
					<n8n-text :class="$style.statusLabel" size="small">{{ executionUIDetails.label }}</n8n-text>
					<n8n-text v-if="executionUIDetails.name === 'running'" :color="isActive? 'text-dark' : 'text-base'" size="small">
						{{ $locale.baseText('executionDetails.runningTimeRunning', { interpolate: { time: executionUIDetails.runningTime } }) }}
					</n8n-text>
					<n8n-text v-else-if="executionUIDetails.name !== 'waiting'" :color="isActive? 'text-dark' : 'text-base'" size="small">
						{{ $locale.baseText('executionDetails.runningTimeFinished', { interpolate: { time: executionUIDetails.runningTime } }) }}
					</n8n-text>
				</div>
				<div v-if="execution.mode === 'retry'">
					<n8n-text :color="isActive? 'text-dark' : 'text-base'" size="small">
						{{ $locale.baseText('executionDetails.retry') }} #{{ execution.retryOf }}
					</n8n-text>
				</div>
			</div>
			<div :class="$style.icons">
				<n8n-action-dropdown
					v-if="executionUIDetails.name === 'error'"
					:class="[$style.icon, $style.retry]"
					:items="retryExecutionActions"
					activatorIcon="redo"
					@select="onRetryMenuItemSelect"
				/>
				<font-awesome-icon
					v-if="execution.mode === 'manual'"
					:class="[$style.icon, $style.manual]"
					:title="$locale.baseText('executionsList.manual')"
					icon="flask"
					/>
			</div>
		</router-link>
	</div>
</template>

<script lang="ts">
import { IExecutionShortResponse, IExecutionsSummary } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { executionHelpers, IExecutionUIData } from '../mixins/executionsHelpers';
import { VIEWS } from '../../constants';
import { showMessage } from '../mixins/showMessage';
import { restApi } from '../mixins/restApi';

export default mixins(
	executionHelpers,
	showMessage,
	restApi,
).extend({
	name: 'execution-card',
	data() {
		return {
			VIEWS,
		};
	},
	props: {
		execution: {
			type: Object as () => IExecutionsSummary,
			required: true,
		},
		highlight: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		retryExecutionActions(): object[] {
			return [
				{ id: 'current-workflow', label: this.$locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') },
				{ id: 'original-workflow', label: this.$locale.baseText('executionsList.retryWithOriginalworkflow') },
			];
		},
		executionUIDetails(): IExecutionUIData {
			return this.getExecutionUIDetails(this.execution);
		},
		isActive(): boolean {
			return this.execution.id === this.$route.params.executionId;
		},
	},
	methods: {
		async onRetryMenuItemSelect(action: string): void {
			const loadWorkflow = action === 'current-workflow';
			const executionData = this.execution as unknown as IExecutionShortResponse;

			await this.retryExecution(executionData, loadWorkflow);
			this.$emit('refresh');

			this.$telemetry.track('User clicked retry execution button', {
				workflow_id: this.$store.getters.workflowId,
				execution_id: executionData.id,
				retry_type: loadWorkflow ? 'current' : 'original',
			});
		},
		async retryExecution (execution: IExecutionShortResponse, loadWorkflow?: boolean) {
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
.executionCard {
	display: flex;
	padding-right: var(--spacing-2xs);

	&.active {
		padding: var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) 0;
		border-left: var(--spacing-4xs) var(--border-style-base) transparent !important;

		.executionStatus {
			color: var(--color-text-dark) !important;
		}
	}

	&:hover, &.active {
		.executionLink {
			background-color: var(--color-foreground-base);
		}
	}

	&.running {
		.spinner {
			position: relative;
			top: 1px;
		}
		&, & .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) hsl(var(--color-warning-h), 94%, 80%);
		}
		.statusLabel, .spinner { color: var(--color-warning); }
	}

	&.success {
		&, & .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) hsl(var(--color-success-h), 60%, 70%);
		}
	}

	&.waiting {
		&, & .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) hsl(var(--color-secondary-h), 94%, 80%);
		}
		.statusLabel { color: var(--color-secondary); }
	}

	&.error {
		&, & .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) hsl(var(--color-danger-h), 94%, 80%);
		}
		.statusLabel { color: var(--color-danger ); }
	}
}

.executionLink {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	color: var(--color-text-base);
	font-size: var(--font-size-xs);
	padding: var(--spacing-xs);
	border-radius: var(--border-radius-base);
	position: relative;
	left: calc(-1 * var(--spacing-4xs)); // Hide link border under card border so it's not visible when not hovered

	&:active {
		.icon, .statusLabel {
			color: var(--color-text-base);;
		}
	}
}

.icons {
	display: flex;
	align-items: baseline;
}

.icon {
	font-size: var(--font-size-s);

	&.retry {
		svg {
			color: var(--color-primary);
		}
	}

	&.manual {
		position: relative;
		top: 1px;
	}

	& + & {
		margin-left: var(--spacing-2xs);
	}
}
</style>
