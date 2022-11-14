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
		<div :class="{[$style.executionDetails]: true, [$style.sidebarCollapsed]: sidebarCollapsed }" v-if="activeExecution">
			<div>
				<n8n-text size="large" color="text-base" :bold="true">{{ executionUIDetails.startTime }}</n8n-text><br>
				<n8n-spinner v-if="executionUIDetails.name === 'running'" size="small" :class="[$style.spinner, 'mr-4xs']"/>
				<n8n-text size="medium" :class="[$style.status, $style[executionUIDetails.name]]">{{ executionUIDetails.label }}</n8n-text>
				<n8n-text v-if="executionUIDetails.name === 'running'" color="text-base" size="medium">
					{{ $locale.baseText('executionDetails.runningTimeRunning', { interpolate: { time: executionUIDetails.runningTime } }) }} | ID#{{ activeExecution.id }}
				</n8n-text>
				<n8n-text v-else-if="executionUIDetails.name !== 'waiting'" color="text-base" size="medium">
					{{ $locale.baseText('executionDetails.runningTimeFinished', { interpolate: { time: executionUIDetails.runningTime } }) }} | ID#{{ activeExecution.id }}
				</n8n-text>
				<n8n-text v-else-if="executionUIDetails.name === 'waiting'" color="text-base" size="medium">
					| ID#{{ activeExecution.id }}
				</n8n-text>
				<br><n8n-text v-if="activeExecution.mode === 'retry'" color="text-base" size= "medium">
					{{ $locale.baseText('executionDetails.retry') }}
					<router-link
						:class="$style.executionLink"
						:to="{ name: VIEWS.EXECUTION_PREVIEW, params: { workflowId: activeExecution.workflowId, executionId: activeExecution.retryOf }}"
					>
						#{{ activeExecution.retryOf }}
					</router-link>
				</n8n-text>
			</div>
			<div>
				<el-dropdown v-if="executionUIDetails.name === 'error'" trigger="click" class="mr-xs" @command="handleRetryClick" ref="retryDropdown">
					<span class="retry-button">
						<n8n-icon-button
							size="large"
							type="tertiary"
							:title="$locale.baseText('executionsList.retryExecution')"
							icon="redo"
							@blur="onRetryButtonBlur"
						/>
					</span>
					<el-dropdown-menu slot="dropdown">
						<el-dropdown-item command="current-workflow">
							{{ $locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
						</el-dropdown-item>
						<el-dropdown-item command="original-workflow">
							{{ $locale.baseText('executionsList.retryWithOriginalWorkflow') }}
						</el-dropdown-item>
					</el-dropdown-menu>
				</el-dropdown>
				<n8n-icon-button :title="$locale.baseText('executionDetails.deleteExecution')" icon="trash" size="large" type="tertiary" @click="onDeleteExecution" />
			</div>
		</div>
		<workflow-preview mode="execution" loaderType="spinner" :executionId="executionId" :executionMode="executionMode"/>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { executionHelpers, IExecutionUIData } from '../mixins/executionsHelpers';
import { VIEWS } from '../../constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import ElDropdown from 'element-ui/lib/dropdown';

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
	computed: {
		...mapStores(
			useUIStore,
		),
		executionUIDetails(): IExecutionUIData | null {
			return this.activeExecution ? this.getExecutionUIDetails(this.activeExecution) : null;
		},
		sidebarCollapsed(): boolean {
			return this.uiStore.sidebarMenuCollapsed;
		},
		executionMode(): string {
			return this.activeExecution?.mode || '';
		},
	},
	methods: {
		async onDeleteExecution(): Promise<void> {
			const deleteConfirmed = await this.confirmMessage(
				this.$locale.baseText('executionDetails.confirmMessage.message'),
				this.$locale.baseText('executionDetails.confirmMessage.headline'),
				'warning',
				this.$locale.baseText('executionDetails.confirmMessage.confirmButtonText'),
				'',
			);
			if (!deleteConfirmed) {
				return;
			}
			this.$emit('deleteCurrentExecution');
		},
		handleRetryClick(command: string): void {
			this.$emit('retryExecution', { execution: this.activeExecution, command });
		},
		onRetryButtonBlur(event: FocusEvent): void {
			// Hide dropdown when clicking outside of current document
			const retryDropdown = this.$refs.retryDropdown as Vue & { hide: () => void } | undefined;
			if (retryDropdown && event.relatedTarget === null) {
				retryDropdown.hide();
			}
		},
	},
});
</script>

<style module lang="scss">

.previewContainer {
	height: calc(100% - $header-height);
	overflow: hidden;
}

.executionDetails {
	position: absolute;
	padding: var(--spacing-m);
	padding-right: var(--spacing-xl);
	width: calc(100% - 510px);
	display: flex;
	justify-content: space-between;
	transition: all 150ms ease-in-out;
	pointer-events: none;

	& * { pointer-events: all; }

	&.sidebarCollapsed {
		width: calc(100% - 375px);
	}
}

.running, .spinner { color: var(--color-warning); }
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
