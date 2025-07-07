<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ExecutionSummary } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { ElDropdown } from 'element-plus';
import { getResourcePermissions } from '@n8n/permissions';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRoute } from 'vue-router';

const props = defineProps<{
	execution: ExecutionSummary & {
		customData?: Record<string, string>;
	};
}>();

const workflowsStore = useWorkflowsStore();
const route = useRoute();
const i18n = useI18n();

const annotationDropdownRef = ref<InstanceType<typeof ElDropdown> | null>(null);
const isDropdownVisible = ref(false);

const workflowId = computed(() => route.params.name as string);
const workflowPermissions = computed(
	() => getResourcePermissions(workflowsStore.getWorkflowById(workflowId.value)?.scopes).workflow,
);

const customDataLength = computed(() => {
	return props.execution?.customData ? Object.keys(props.execution?.customData).length : 0;
});

function onEllipsisButtonBlur(event: FocusEvent) {
	// Hide dropdown when clicking outside of current document
	if (annotationDropdownRef.value && event.relatedTarget === null) {
		annotationDropdownRef.value.handleClose();
	}
}

function onDropdownVisibleChange(visible: boolean) {
	isDropdownVisible.value = visible;
}
</script>

<template>
	<ElDropdown
		v-if="execution"
		ref="annotationDropdownRef"
		trigger="click"
		@visible-change="onDropdownVisibleChange"
	>
		<N8nButton
			:title="i18n.baseText('executionDetails.additionalActions')"
			:disabled="!workflowPermissions.update"
			icon="list-checks"
			:class="{
				[$style.highlightDataButton]: true,
				[$style.highlightDataButtonActive]: customDataLength > 0,
				[$style.highlightDataButtonOpen]: isDropdownVisible,
			}"
			size="small"
			type="secondary"
			data-test-id="execution-preview-ellipsis-button"
			@blur="onEllipsisButtonBlur"
		>
			<n8n-badge v-if="customDataLength > 0" :class="$style.badge" theme="primary">
				{{ customDataLength.toString() }}
			</n8n-badge>
		</N8nButton>
		<template #dropdown>
			<div
				ref="container"
				:class="['execution-annotation-panel', $style.container]"
				data-test-id="execution-annotation-panel"
			>
				<div :class="$style.section">
					<div :class="$style.heading">
						<n8n-heading tag="h3" size="small" color="text-dark">
							{{ i18n.baseText('generic.annotationData') }}
						</n8n-heading>
					</div>
					<div
						v-if="execution?.customData && Object.keys(execution?.customData).length > 0"
						:class="$style.metadata"
					>
						<div
							v-for="attr in Object.keys(execution?.customData)"
							:key="attr"
							:class="$style.customDataEntry"
						>
							<n8n-text :class="$style.key" size="small" color="text-base">
								{{ attr }}
							</n8n-text>
							<n8n-text :class="$style.value" size="small" color="text-base">
								{{ execution?.customData[attr] }}
							</n8n-text>
						</div>
					</div>
					<div
						v-else
						:class="$style.noResultsContainer"
						data-test-id="execution-annotation-data-empty"
					>
						<n8n-text color="text-base" size="small" align="center">
							<span v-n8n-html="i18n.baseText('executionAnnotationView.data.notFound')" />
						</n8n-text>
					</div>
				</div>
			</div>
		</template>
	</ElDropdown>
</template>

<style module lang="scss">
.highlightDataButton {
	height: 30px;
	width: 30px;
}

.highlightDataButtonActive {
	width: auto;
}

.highlightDataButtonOpen {
	color: var(--color-primary);
	background-color: var(--color-button-secondary-hover-background);
	border-color: var(--color-button-secondary-hover-active-focus-border);
}

.badge {
	border: 0;
}

.container {
	z-index: 1;
	max-height: calc(100vh - 250px);
	width: 250px;

	display: flex;
	flex-direction: column;
	overflow: auto;

	background-color: var(--color-background-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
}

.section {
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		border-bottom: var(--border-base);
	}
}

.metadata {
	padding-top: var(--spacing-s);
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing-l);
}

.controls {
	padding: var(--spacing-s) 0 var(--spacing-xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-m);

	button {
		display: flex;
		align-items: center;
	}
}

.customDataEntry {
	display: flex;
	flex-direction: column;

	&:not(:first-of-type) {
		margin-top: var(--spacing-s);
	}

	.key {
		font-weight: var(--font-weight-bold);
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing-s);
}

.execution-annotation-panel {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}
</style>
