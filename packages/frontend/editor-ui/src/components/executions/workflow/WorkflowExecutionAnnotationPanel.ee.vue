<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ExecutionSummary } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRoute } from 'vue-router';

import { ElDropdown } from 'element-plus';
import { N8nBadge, N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
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
			<N8nBadge v-if="customDataLength > 0" :class="$style.badge" theme="primary">
				{{ customDataLength.toString() }}
			</N8nBadge>
		</N8nButton>
		<template #dropdown>
			<div
				ref="container"
				:class="['execution-annotation-panel', $style.container]"
				data-test-id="execution-annotation-panel"
			>
				<div :class="$style.section">
					<div :class="$style.heading">
						<N8nHeading tag="h3" size="small" color="text-dark">
							{{ i18n.baseText('generic.annotationData') }}
						</N8nHeading>
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
							<N8nText :class="$style.key" size="small" color="text-base">
								{{ attr }}
							</N8nText>
							<N8nText :class="$style.value" size="small" color="text-base">
								{{ execution?.customData[attr] }}
							</N8nText>
						</div>
					</div>
					<div
						v-else
						:class="$style.noResultsContainer"
						data-test-id="execution-annotation-data-empty"
					>
						<N8nText color="text-base" size="small" align="center">
							<span v-n8n-html="i18n.baseText('executionAnnotationView.data.notFound')" />
						</N8nText>
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
	color: var(--color--primary);
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

	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);
}

.section {
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		border-bottom: var(--border);
	}
}

.metadata {
	padding-top: var(--spacing--sm);
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing--lg);
}

.controls {
	padding: var(--spacing--sm) 0 var(--spacing--xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing--md);

	button {
		display: flex;
		align-items: center;
	}
}

.customDataEntry {
	display: flex;
	flex-direction: column;

	&:not(:first-of-type) {
		margin-top: var(--spacing--sm);
	}

	.key {
		font-weight: var(--font-weight--bold);
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing--sm);
}

.execution-annotation-panel {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}
</style>
