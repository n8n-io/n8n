<template>
	<div
		:class="{
			['execution-card']: true,
			[$style.WorkflowExecutionsCard]: true,
			[$style.active]: isActive,
			[$style[executionUIDetails.name]]: true,
			[$style.highlight]: highlight,
			[$style.showGap]: showGap,
		}"
	>
		<router-link
			:class="$style.executionLink"
			:to="{
				name: executionPreviewViewName,
				params: { name: currentWorkflow, executionId: execution.id },
			}"
			:data-test-execution-status="executionUIDetails.name"
		>
			<div :class="$style.description">
				<n8n-text color="text-dark" :bold="true" size="medium" data-test-id="execution-time">
					{{ executionUIDetails.startTime }}
				</n8n-text>
				<div :class="$style.executionStatus">
					<n8n-spinner
						v-if="executionUIDetails.name === 'running'"
						size="small"
						:class="[$style.spinner, 'mr-4xs']"
					/>
					<n8n-text :class="$style.statusLabel" size="small">{{
						executionUIDetails.label
					}}</n8n-text>
					{{ ' ' }}
					<n8n-text
						v-if="executionUIDetails.name === 'running'"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
					>
						{{ $locale.baseText('executionDetails.runningTimeRunning') }}
						<ExecutionsTime :start-time="execution.startedAt" />
					</n8n-text>
					<n8n-text
						v-else-if="executionUIDetails.runningTime !== ''"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
					>
						{{
							$locale.baseText('executionDetails.runningTimeFinished', {
								interpolate: { time: executionUIDetails?.runningTime },
							})
						}}
					</n8n-text>
				</div>
				<div v-if="execution.mode === 'retry'">
					<n8n-text :color="isActive ? 'text-dark' : 'text-base'" size="small">
						{{ $locale.baseText('executionDetails.retry') }} #{{ execution.retryOf }}
					</n8n-text>
				</div>
			</div>
			<div :class="$style.icons">
				<n8n-action-dropdown
					v-if="isRetriable"
					:class="[$style.icon, $style.retry]"
					:items="retryExecutionActions"
					activator-icon="redo"
					data-test-id="retry-execution-button"
					@select="onRetryMenuItemSelect"
				/>
				<n8n-tooltip v-if="execution.mode === 'manual'" placement="top">
					<template #content>
						<span>{{ $locale.baseText('executionsList.test') }}</span>
					</template>
					<font-awesome-icon
						v-if="execution.mode === 'manual'"
						:class="[$style.icon, $style.manual]"
						icon="flask"
					/>
				</n8n-tooltip>
			</div>
		</router-link>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { IExecutionUIData } from '@/composables/useExecutionHelpers';
import { VIEWS } from '@/constants';
import ExecutionsTime from '@/components/executions/ExecutionsTime.vue';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import type { ExecutionSummary } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';

export default defineComponent({
	name: 'WorkflowExecutionsCard',
	components: {
		ExecutionsTime,
	},
	props: {
		execution: {
			type: Object as () => ExecutionSummary,
			required: true,
		},
		highlight: {
			type: Boolean,
			default: false,
		},
		showGap: {
			type: Boolean,
			default: false,
		},
	},
	emits: ['retryExecution', 'mounted'],
	setup() {
		const executionHelpers = useExecutionHelpers();

		return {
			executionHelpers,
		};
	},
	computed: {
		...mapStores(useWorkflowsStore),
		currentWorkflow(): string {
			return (this.$route.params.name as string) || this.workflowsStore.workflowId;
		},
		retryExecutionActions(): object[] {
			return [
				{
					id: 'current-workflow',
					label: this.$locale.baseText('executionsList.retryWithCurrentlySavedWorkflow'),
				},
				{
					id: 'original-workflow',
					label: this.$locale.baseText('executionsList.retryWithOriginalWorkflow'),
				},
			];
		},
		executionUIDetails(): IExecutionUIData {
			return this.executionHelpers.getUIDetails(this.execution);
		},
		isActive(): boolean {
			return this.execution.id === this.$route.params.executionId;
		},
		isRetriable(): boolean {
			return this.executionHelpers.isExecutionRetriable(this.execution);
		},
		executionPreviewViewName() {
			return VIEWS.EXECUTION_PREVIEW;
		},
	},
	mounted() {
		this.$emit('mounted', this.execution.id);
	},
	methods: {
		onRetryMenuItemSelect(action: string): void {
			this.$emit('retryExecution', { execution: this.execution, command: action });
		},
	},
});
</script>

<style module lang="scss">
@import '@/styles/variables';

.WorkflowExecutionsCard {
	--execution-list-item-background: var(--color-foreground-xlight);
	--execution-list-item-highlight-background: var(--color-warning-tint-1);

	display: flex;
	flex-direction: column;
	padding-right: var(--spacing-m);

	&.active {
		border-left: var(--spacing-4xs) var(--border-style-base) transparent !important;

		.executionStatus {
			color: var(--color-text-dark) !important;
		}
	}

	&:hover,
	&.active {
		.executionLink {
			--execution-list-item-background: var(--color-foreground-light);
		}
	}

	&.new,
	&.running {
		.spinner {
			position: relative;
			top: 1px;
		}
		&,
		& .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) var(--execution-card-border-running);
		}
		.statusLabel,
		.spinner {
			color: var(--color-warning);
		}
	}

	&.success {
		&,
		& .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) var(--execution-card-border-success);
		}
	}

	&.waiting {
		&,
		& .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) var(--execution-card-border-waiting);
		}
		.statusLabel {
			color: var(--color-secondary);
		}
	}

	&.error {
		&,
		& .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) var(--execution-card-border-error);
		}
		.statusLabel {
			color: var(--color-danger);
		}
	}

	&.unknown {
		&,
		& .executionLink {
			border-left: var(--spacing-4xs) var(--border-style-base) var(--execution-card-border-unknown);
		}
	}
}

.executionLink {
	background: var(--execution-list-item-background);
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	color: var(--color-text-base);
	font-size: var(--font-size-xs);
	padding: var(--spacing-xs);
	padding-right: var(--spacing-s);
	position: relative;
	left: calc(
		-1 * var(--spacing-4xs)
	); // Hide link border under card border so it's not visible when not hovered

	&:active {
		.icon,
		.statusLabel {
			color: var(--color-text-base);
		}
	}
}

.icons {
	display: flex;
	align-items: center;
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
.showGap {
	margin-bottom: var(--spacing-2xs);
	.executionLink {
		border-bottom: 1px solid var(--color-foreground-dark);
	}
}
</style>
