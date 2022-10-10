<template>
	<div
		:class="{
			['execution-card']: true,
			[$style.executionCard]: true,
			[$style.active]: activeExecution && execution.id === activeExecution.id,
			[$style[executionUIDetails.name]]: true,
		}"
	>
		<router-link
			:class="$style.executionLink"
			:to="{ name: VIEWS.EXECUTION_PREVIEW, params: { workflowId: currentWorkflow, executionId: execution.id }}"
		>
			<div :class="$style.description">
				<n8n-text color="text-dark" :bold="true" size="medium">{{ executionUIDetails.startTime }}</n8n-text>
				<div>
					<n8n-text :class="$style.statusLabel" size="small">{{ executionUIDetails.label }}</n8n-text>
					<n8n-text color="text-base" size="small"> in {{ executionUIDetails.runningTime }}</n8n-text>
				</div>
			</div>
			<div :class="$style.icons">
				<n8n-action-dropdown
					v-if="execution.stoppedAt !== undefined && !execution.finished && execution.retryOf === undefined && execution.retrySuccessId === undefined && !execution.waitTill"
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
	padding: var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) 0;

	&:hover, &.active {
		border-left: 4px solid transparent !important;

		.executionLink {
			background-color: #DBDFE7;
		}
	}

	&.success {
		&, & .executionLink {
			border-left: 4px solid #29A568;
		}
	}
	&.waiting {
		&, & .executionLink {
			border-left: 4px solid #5C4EC2;
		}
		.statusLabel { color: #5C4EC2; }
	}
	&.error {
		&, & .executionLink {
			border-left: 4px solid #FF6D5A;
		}
		.statusLabel { color: #FF6D5A; }
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
	border-radius: 4px;
	position: relative;
	left: -4px;

	&:active {
		.icon {
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
