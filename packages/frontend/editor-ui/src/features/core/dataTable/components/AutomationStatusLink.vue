<script setup lang="ts">
import { computed } from 'vue';
import { N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { VIEWS } from '@/app/constants';
import type { DataTableRowAutomation } from '@/features/core/dataTable/dataTable.types';

const props = defineProps<{ automation: DataTableRowAutomation }>();

const i18n = useI18n();

const link = computed(() => {
	const { workflowId, executionId, executionExists } = props.automation;
	if (executionId && executionExists) {
		return { name: VIEWS.EXECUTION_PREVIEW, params: { workflowId, executionId } };
	}
	return { name: VIEWS.WORKFLOW, params: { workflowId } };
});

const statusText = computed(() =>
	i18n.baseText(`dataTable.automation.status.${props.automation.status}`),
);

const tooltip = computed(() => {
	const detail = props.automation.error ? `: ${props.automation.error}` : '';
	const action = i18n.baseText(
		props.automation.executionExists
			? 'dataTable.automation.openExecution'
			: 'dataTable.automation.openWorkflow',
	);
	return `${statusText.value}${detail} · ${action}`;
});
</script>

<template>
	<N8nTooltip :content="tooltip" placement="top">
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
