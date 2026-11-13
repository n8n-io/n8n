<script setup lang="ts">
import {
	N8nBadge,
	N8nDropdownMenu,
	N8nIcon,
	N8nTag,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import type { SubWorkflowEntry, SubWorkflowStatus } from '../composables/useSubWorkflowScope';

const props = defineProps<{ subWorkflows: SubWorkflowEntry[] }>();

const i18n = useI18n();
const router = useRouter();

const HEADER_ID = '__sub-workflows-header__';

function statusLabel(status: SubWorkflowStatus) {
	if (status === 'external') return i18n.baseText('selfHealing.config.subWorkflows.external');
	if (status === 'uncovered') return i18n.baseText('selfHealing.config.subWorkflows.notCovered');
	return null;
}

const items = computed<Array<DropdownMenuItemProps<string, string | null>>>(() => [
	{
		id: HEADER_ID,
		label: i18n.baseText('selfHealing.config.subWorkflows.heading'),
		icon: { type: 'icon', value: 'log-in' },
		disabled: true,
	},
	...props.subWorkflows.map((subWorkflow) => ({
		id: subWorkflow.id,
		label: subWorkflow.name,
		data: statusLabel(subWorkflow.status),
		testId: `self-healing-sub-workflow-${subWorkflow.id}`,
	})),
]);

function onSelect(workflowId: string) {
	if (workflowId === HEADER_ID) return;
	const { href } = router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } });
	window.open(href, '_blank', 'noopener');
}
</script>

<template>
	<N8nDropdownMenu
		:items="items"
		placement="bottom-end"
		:max-height="280"
		data-test-id="self-healing-sub-workflow-pill"
		@select="onSelect"
	>
		<template #trigger>
			<N8nTooltip
				:content="i18n.baseText('selfHealing.config.subWorkflows.tooltip')"
				placement="top"
				as-child
			>
				<N8nBadge
					variant="outline"
					clickable
					:aria-label="
						i18n.baseText('selfHealing.config.subWorkflows.count', {
							adjustToNumber: subWorkflows.length,
							interpolate: { count: String(subWorkflows.length) },
						})
					"
				>
					<template #leading>
						<N8nIcon icon="graph-12" size="small" :class="$style.icon" />
					</template>
					{{ subWorkflows.length }}
				</N8nBadge>
			</N8nTooltip>
		</template>
		<template #item-trailing="{ item }">
			<N8nTag v-if="item.data" :text="item.data" :clickable="false" />
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.icon {
	flex-shrink: 0;
	opacity: 0.9;
}
</style>
