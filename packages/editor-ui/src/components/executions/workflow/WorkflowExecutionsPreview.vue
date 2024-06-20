<template>
	<div v-if="executionUIDetails?.name === 'running'" :class="$style.runningInfo">
		<div :class="$style.spinner">
			<n8n-spinner type="ring" />
		</div>
		<n8n-text :class="$style.runningMessage" color="text-light">
			{{ $locale.baseText('executionDetails.runningMessage') }}
		</n8n-text>
		<n8n-button class="mt-l" type="tertiary" @click="handleStopClick">
			{{ $locale.baseText('executionsList.stopExecution') }}
		</n8n-button>
	</div>
	<div v-else-if="executionUIDetails" :class="$style.previewContainer">
		<div
			v-if="execution"
			:class="$style.executionDetails"
			:data-test-id="`execution-preview-details-${executionId}`"
		>
			<div>
				<n8n-text size="large" color="text-base" :bold="true" data-test-id="execution-time">{{
					executionUIDetails?.startTime
				}}</n8n-text
				><br />
				<n8n-spinner
					v-if="executionUIDetails?.name === 'running'"
					size="small"
					:class="[$style.spinner, 'mr-4xs']"
				/>
				<n8n-text
					size="medium"
					:class="[$style.status, $style[executionUIDetails.name]]"
					data-test-id="execution-preview-label"
				>
					{{ executionUIDetails.label }}
				</n8n-text>
				{{ ' ' }}
				<n8n-text v-if="executionUIDetails.name === 'running'" color="text-base" size="medium">
					{{
						$locale.baseText('executionDetails.runningTimeRunning', {
							interpolate: { time: executionUIDetails?.runningTime },
						})
					}}
					| ID#{{ execution.id }}
				</n8n-text>
				<n8n-text
					v-else-if="executionUIDetails.name !== 'waiting'"
					color="text-base"
					size="medium"
					data-test-id="execution-preview-id"
				>
					{{
						$locale.baseText('executionDetails.runningTimeFinished', {
							interpolate: { time: executionUIDetails?.runningTime ?? 'unknown' },
						})
					}}
					| ID#{{ execution.id }}
				</n8n-text>
				<n8n-text
					v-else-if="executionUIDetails?.name === 'waiting'"
					color="text-base"
					size="medium"
				>
					| ID#{{ execution.id }}
				</n8n-text>
				<br /><n8n-text v-if="execution.mode === 'retry'" color="text-base" size="medium">
					{{ $locale.baseText('executionDetails.retry') }}
					<router-link
						:class="$style.executionLink"
						:to="{
							name: executionPreviewViewName,
							params: {
								workflowId: execution.workflowId,
								executionId: execution.retryOf,
							},
						}"
					>
						#{{ execution.retryOf }}
					</router-link>
				</n8n-text>
			</div>
			<div>
				<n8n-button size="medium" :type="debugButtonData.type" :class="$style.debugLink">
					<router-link
						:to="{
							name: executionDebugViewName,
							params: {
								name: execution.workflowId,
								executionId: execution.id,
							},
						}"
					>
						<span data-test-id="execution-debug-button" @click="handleDebugLinkClick">{{
							debugButtonData.text
						}}</span>
					</router-link>
				</n8n-button>

				<ElDropdown
					v-if="isRetriable"
					ref="retryDropdown"
					trigger="click"
					class="mr-xs"
					@command="handleRetryClick"
				>
					<span class="retry-button">
						<n8n-icon-button
							size="medium"
							type="tertiary"
							:title="$locale.baseText('executionsList.retryExecution')"
							icon="redo"
							data-test-id="execution-preview-retry-button"
							@blur="onRetryButtonBlur"
						/>
					</span>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="current-workflow">
								{{ $locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
							</el-dropdown-item>
							<el-dropdown-item command="original-workflow">
								{{ $locale.baseText('executionsList.retryWithOriginalWorkflow') }}
							</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</ElDropdown>
				<n8n-icon-button
					:title="$locale.baseText('executionDetails.deleteExecution')"
					icon="trash"
					size="medium"
					type="tertiary"
					data-test-id="execution-preview-delete-button"
					@click="onDeleteExecution"
				/>
			</div>
		</div>
		<WorkflowPreview
			mode="execution"
			loader-type="spinner"
			:execution-id="executionId"
			:execution-mode="executionMode"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ElDropdown } from 'element-plus';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import { useMessage } from '@/composables/useMessage';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import type { ExecutionSummary } from 'n8n-workflow';
import type { IExecutionUIData } from '@/composables/useExecutionHelpers';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mapStores } from 'pinia';

type RetryDropdownRef = InstanceType<typeof ElDropdown> & { hide: () => void };

export default defineComponent({
	name: 'WorkflowExecutionsPreview',
	components: {
		ElDropdown,
		WorkflowPreview,
	},
	props: {
		execution: {
			type: Object as () => ExecutionSummary | null,
			required: true,
		},
	},
	setup() {
		const executionHelpers = useExecutionHelpers();

		return {
			executionHelpers,
			...useMessage(),
			...useExecutionDebugging(),
		};
	},
	computed: {
		...mapStores(useWorkflowsStore),
		executionId(): string {
			return this.$route.params.executionId as string;
		},
		executionUIDetails(): IExecutionUIData | null {
			return this.execution ? this.executionHelpers.getUIDetails(this.execution) : null;
		},
		executionMode(): string {
			return this.execution?.mode || '';
		},
		debugButtonData(): Record<string, string> {
			return this.execution?.status === 'success'
				? {
						text: this.$locale.baseText('executionsList.debug.button.copyToEditor'),
						type: 'secondary',
					}
				: {
						text: this.$locale.baseText('executionsList.debug.button.debugInEditor'),
						type: 'primary',
					};
		},
		isRetriable(): boolean {
			return !!this.execution && this.executionHelpers.isExecutionRetriable(this.execution);
		},
		executionDebugViewName() {
			return VIEWS.EXECUTION_DEBUG;
		},
		executionPreviewViewName() {
			return VIEWS.EXECUTION_PREVIEW;
		},
	},
	methods: {
		async onDeleteExecution(): Promise<void> {
			const deleteConfirmed = await this.confirm(
				this.$locale.baseText('executionDetails.confirmMessage.message'),
				this.$locale.baseText('executionDetails.confirmMessage.headline'),
				{
					type: 'warning',
					confirmButtonText: this.$locale.baseText(
						'executionDetails.confirmMessage.confirmButtonText',
					),
					cancelButtonText: '',
				},
			);
			if (deleteConfirmed !== MODAL_CONFIRM) {
				return;
			}
			this.$emit('deleteCurrentExecution');
		},
		handleRetryClick(command: string): void {
			this.$emit('retryExecution', { execution: this.execution, command });
		},
		handleStopClick(): void {
			this.$emit('stopExecution');
		},
		onRetryButtonBlur(event: FocusEvent): void {
			// Hide dropdown when clicking outside of current document
			const retryDropdownRef = this.$refs.retryDropdown as RetryDropdownRef | undefined;
			if (retryDropdownRef && event.relatedTarget === null) {
				retryDropdownRef.handleClose();
			}
		},
	},
});
</script>

<style module lang="scss">
.previewContainer {
	position: relative;
	height: 100%;
	overflow: hidden;
}

.executionDetails {
	position: absolute;
	padding: var(--spacing-m);
	padding-right: var(--spacing-xl);
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	transition: all 150ms ease-in-out;
	pointer-events: none;

	> div:last-child {
		display: flex;
		align-items: center;
	}

	& * {
		pointer-events: all;
	}
}

.spinner {
	div div {
		width: 30px;
		height: 30px;
		border-width: 2px;
	}
}

.running,
.spinner {
	color: var(--color-warning);
}
.waiting {
	color: var(--color-secondary);
}
.success {
	color: var(--color-success);
}
.error {
	color: var(--color-danger);
}

.runningInfo {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing-4xl);
}

.runningMessage {
	width: 200px;
	margin-top: var(--spacing-l);
	text-align: center;
}

.debugLink {
	margin-right: var(--spacing-xs);
	padding: 0;

	a > span {
		display: block;
		padding: var(--button-padding-vertical, var(--spacing-xs))
			var(--button-padding-horizontal, var(--spacing-m));
	}
}
</style>
