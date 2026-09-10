<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';
import { computed } from 'vue';
import { N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { VIEWS } from '@/app/constants';
import type {
	DataTableRow,
	DataTableRowAutomation,
} from '@/features/core/dataTable/dataTable.types';

const props = defineProps<{
	params: ICellRendererParams<DataTableRow> & { nodeId: string };
}>();

const i18n = useI18n();

const automation = computed<DataTableRowAutomation | undefined>(() => {
	const list: unknown = props.params.data?.automations;
	if (!Array.isArray(list)) return undefined;
	return (list as DataTableRowAutomation[]).find((entry) => entry.nodeId === props.params.nodeId);
});

const link = computed(() => {
	if (!automation.value) return undefined;
	const { workflowId, executionId, executionExists } = automation.value;
	if (executionId && executionExists) {
		return { name: VIEWS.EXECUTION_PREVIEW, params: { workflowId, executionId } };
	}
	return { name: VIEWS.WORKFLOW, params: { workflowId } };
});

const statusText = computed(() =>
	automation.value ? i18n.baseText(`dataTable.automation.status.${automation.value.status}`) : '',
);

const tooltip = computed(() => {
	if (!automation.value) return '';
	const detail = automation.value.error ? `: ${automation.value.error}` : '';
	const action = i18n.baseText(
		automation.value.executionExists
			? 'dataTable.automation.openExecution'
			: 'dataTable.automation.openWorkflow',
	);
	return `${statusText.value}${detail} · ${action}`;
});
</script>

<template>
	<N8nTooltip v-if="automation && link" :content="tooltip" placement="top">
		<RouterLink
			:to="link"
			:class="['automation-status-cell', `automation-status-cell--${automation.status}`]"
		>
			{{ statusText }}
		</RouterLink>
	</N8nTooltip>
</template>

<style lang="scss">
// Not a CSS module: `$style` is undefined inside ag-grid cell renderers.
.automation-status-cell {
	display: inline-flex;
	align-items: center;
	height: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	text-decoration: none;

	&--finished {
		color: var(--color--success);
	}
	&--failed {
		color: var(--color--danger);
	}
	&--running {
		color: var(--color--primary);
	}
}
</style>
