<script setup lang="ts" generic="T">
import { useI18n } from '@/composables/useI18n';
import type { TestTableColumn } from './TestTableBase.vue';
import { useRouter } from 'vue-router';
import N8nTooltip from 'n8n-design-system/components/N8nTooltip';
import type { BaseTextKey } from '@/plugins/i18n';

defineProps<{
	column: TestTableColumn<T>;
	row: T;
}>();

defineEmits<{
	click: [];
}>();

const locale = useI18n();
const router = useRouter();
interface WithStatus {
	status: string;
}

interface WithError {
	errorCode: string;
}

function hasStatus(row: unknown): row is WithStatus {
	return typeof row === 'object' && row !== null && 'status' in row;
}

function hasError(row: unknown): row is WithError {
	return typeof row === 'object' && row !== null && 'errorCode' in row;
}

// FIXME: move status logic to a parent component
const statusThemeMap: Record<string, string> = {
	new: 'default',
	running: 'warning',
	evaluation_running: 'warning',
	completed: 'success',
	error: 'danger',
	success: 'success',
	warning: 'warning',
	cancelled: 'default',
};

const statusLabelMap: Record<string, string> = {
	new: locale.baseText('testDefinition.listRuns.status.new'),
	running: locale.baseText('testDefinition.listRuns.status.running'),
	evaluation_running: locale.baseText('testDefinition.listRuns.status.evaluating'),
	completed: locale.baseText('testDefinition.listRuns.status.completed'),
	error: locale.baseText('testDefinition.listRuns.status.error'),
	success: locale.baseText('testDefinition.listRuns.status.success'),
	warning: locale.baseText('testDefinition.listRuns.status.warning'),
	cancelled: locale.baseText('testDefinition.listRuns.status.cancelled'),
};

const errorTooltipMap: Record<string, BaseTextKey> = {
	// Test case errors
	MOCKED_NODE_DOES_NOT_EXIST: 'testDefinition.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_EVALUATION_WORKFLOW: 'testDefinition.runDetail.error.evaluationFailed',
	FAILED_TO_EXECUTE_WORKFLOW: 'testDefinition.runDetail.error.executionFailed',
	TRIGGER_NO_LONGER_EXISTS: 'testDefinition.runDetail.error.triggerNoLongerExists',
	METRICS_MISSING: 'testDefinition.runDetail.error.metricsMissing',
	UNKNOWN_METRICS: 'testDefinition.runDetail.error.unknownMetrics',
	INVALID_METRICS: 'testDefinition.runDetail.error.invalidMetrics',

	// Test run errors
	PAST_EXECUTIONS_NOT_FOUND: 'testDefinition.listRuns.error.noPastExecutions',
	EVALUATION_WORKFLOW_NOT_FOUND: 'testDefinition.listRuns.error.evaluationWorkflowNotFound',
};

function hasProperty(row: unknown, prop: string): row is Record<string, unknown> {
	return typeof row === 'object' && row !== null && prop in row;
}

const getCellContent = (column: TestTableColumn<T>, row: T) => {
	if (column.formatter) {
		return column.formatter(row);
	}
	return hasProperty(row, column.prop) ? row[column.prop] : undefined;
};

function getErrorTooltip(column: TestTableColumn<T>, row: T): string | undefined {
	if (hasError(row) && errorTooltipMap[row.errorCode]) {
		const tooltipLinkUrl = getErrorTooltipUrl(column, row);

		if (tooltipLinkUrl) {
			return locale.baseText(errorTooltipMap[row.errorCode], {
				interpolate: {
					url: tooltipLinkUrl,
				},
			});
		} else {
			return locale.baseText(errorTooltipMap[row.errorCode]);
		}
	}

	return undefined;
}

function getErrorTooltipUrl(column: TestTableColumn<T>, row: T): string | undefined {
	if (hasError(row) && column.errorRoute?.(row)) {
		return router.resolve(column.errorRoute(row)!).href;
	}

	return undefined;
}
</script>

<template>
	<div v-if="column.route?.(row)">
		<a v-if="column.openInNewTab" :href="router.resolve(column.route(row)!).href" target="_blank">
			{{ getCellContent(column, row) }}
		</a>
		<router-link v-else :to="column.route(row)!">
			{{ getCellContent(column, row) }}
		</router-link>
	</div>

	<N8nTooltip
		v-else-if="column.prop === 'status' && hasStatus(row)"
		placement="right"
		:show-after="300"
		:disabled="getErrorTooltip(column, row) === undefined"
	>
		<template #content>
			<div v-n8n-html="getErrorTooltip(column, row)" />
		</template>
		<N8nBadge :theme="statusThemeMap[row.status]" class="mr-4xs">
			{{ statusLabelMap[row.status] }}
		</N8nBadge>
	</N8nTooltip>

	<div v-else>
		{{ getCellContent(column, row) }}
	</div>
</template>
