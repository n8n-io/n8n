<script setup lang="ts" generic="T">
import N8nTooltip from '@n8n/design-system/components/N8nTooltip';
import type { BaseTextKey } from '@n8n/i18n';
import type { TestTableColumn } from '@/components/Evaluations.ee/shared/TestTableBase.vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import type { BadgeTheme } from '@n8n/design-system';

defineProps<{
	column: TestTableColumn<T>;
	row: T & { status: string };
}>();

const locale = useI18n();
const router = useRouter();

interface WithError {
	errorCode: string;
}

function hasError(row: unknown): row is WithError {
	return typeof row === 'object' && row !== null && 'errorCode' in row;
}

const errorTooltipMap: Record<string, BaseTextKey> = {
	// Test case errors
	MOCKED_NODE_NOT_FOUND: 'evaluation.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_WORKFLOW: 'evaluation.runDetail.error.executionFailed',
	INVALID_METRICS: 'evaluation.runDetail.error.invalidMetrics',

	// Test run errors
	TEST_CASES_NOT_FOUND: 'evaluation.listRuns.error.testCasesNotFound',
	EVALUATION_TRIGGER_NOT_FOUND: 'evaluation.listRuns.error.evaluationTriggerNotFound',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'evaluation.listRuns.error.evaluationTriggerNotConfigured',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setOutputsNodeNotConfigured',
	SET_METRICS_NODE_NOT_FOUND: 'evaluation.listRuns.error.setMetricsNodeNotFound',
	SET_METRICS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setMetricsNodeNotConfigured',
	CANT_FETCH_TEST_CASES: 'evaluation.listRuns.error.cantFetchTestCases',
};

// FIXME: move status logic to a parent component
const statusThemeMap: Record<string, BadgeTheme> = {
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
	new: locale.baseText('evaluation.listRuns.status.new'),
	running: locale.baseText('evaluation.listRuns.status.running'),
	evaluation_running: locale.baseText('evaluation.listRuns.status.evaluating'),
	completed: locale.baseText('evaluation.listRuns.status.completed'),
	error: locale.baseText('evaluation.listRuns.status.error'),
	success: locale.baseText('evaluation.listRuns.status.success'),
	warning: locale.baseText('evaluation.listRuns.status.warning'),
	cancelled: locale.baseText('evaluation.listRuns.status.cancelled'),
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
	<N8nTooltip
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
</template>
