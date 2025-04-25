<script setup lang="ts" generic="T">
import N8nTooltip from '@n8n/design-system/components/N8nTooltip';
import type { BaseTextKey } from '@/plugins/i18n';
import type { TestTableColumn } from '@/components/Evaluations/shared/TestTableBase.vue';
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';

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
	MOCKED_NODE_NOT_FOUND: 'testDefinition.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_WORKFLOW: 'testDefinition.runDetail.error.executionFailed',
	INVALID_METRICS: 'testDefinition.runDetail.error.invalidMetrics',

	// Test run errors
	TEST_CASES_NOT_FOUND: 'testDefinition.listRuns.error.testCasesNotFound',
	EVALUATION_TRIGGER_NOT_FOUND: 'testDefinition.listRuns.error.evaluationTriggerNotFound',
};

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

<style scoped lang="scss"></style>
