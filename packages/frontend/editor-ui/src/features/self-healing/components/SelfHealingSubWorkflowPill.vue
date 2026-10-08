<script setup lang="ts">
import {
	N8nBadge,
	N8nDropdownMenu,
	N8nIcon,
	N8nTag,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';

import type { SubWorkflowEntry, SubWorkflowStatus } from '../composables/useSubWorkflowScope';

/**
 * The sub-workflows a selected workflow calls, behind a link icon and a count.
 * Same trigger and menu as the dependency pill on workflow cards, limited to
 * sub-workflows, and each one says whether this configuration covers it.
 * An item opens the sub-workflow in a new tab, so the form keeps its edits.
 */
const props = defineProps<{
	subWorkflows: SubWorkflowEntry[];
}>();

const i18n = useI18n();
const router = useRouter();

const HEADER_ID = '__sub-workflows-header__';

/** Why this configuration does not cover a sub-workflow; `null` when it does. */
function statusLabel(status: SubWorkflowStatus | undefined): string | null {
	switch (status) {
		case 'external':
			return i18n.baseText('selfHealing.config.scope.subWorkflows.external');
		case 'elsewhere':
			return i18n.baseText('selfHealing.config.scope.subWorkflows.otherConfig');
		case 'uncovered':
			return i18n.baseText('selfHealing.config.scope.subWorkflows.notCovered');
		default:
			return null;
	}
}

const items = computed<Array<DropdownMenuItemProps<string, SubWorkflowStatus>>>(() => [
	// A disabled first item as the group label, as the dependency pill does.
	{
		id: HEADER_ID,
		label: i18n.baseText('workflows.dependencies.type.subWorkflows'),
		icon: { type: 'icon', value: 'log-in' },
		disabled: true,
	},
	...props.subWorkflows.map((sub) => ({
		id: sub.id,
		label: sub.name,
		data: sub.status,
		testId: `self-healing-sub-workflow-${sub.id}`,
	})),
]);

function onSelect(workflowId: string) {
	if (workflowId === HEADER_ID) return;
	const href = router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } }).href;
	window.open(href, '_blank');
}
</script>

<template>
	<N8nTooltip
		:content="i18n.baseText('selfHealing.config.scope.subWorkflows.tooltip')"
		placement="top"
		:show-after="300"
	>
		<N8nDropdownMenu
			:items="items"
			placement="bottom-end"
			:max-height="280"
			data-test-id="self-healing-sub-workflow-pill"
			@select="onSelect"
		>
			<template #trigger>
				<N8nBadge theme="tertiary" :show-border="false" :class="$style.badge">
					<span :class="$style.badgeText">
						<N8nIcon icon="link" size="small" />
						{{ subWorkflows.length }}
					</span>
				</N8nBadge>
			</template>
			<template #item-trailing="{ item }">
				<N8nTag
					v-if="statusLabel(item.data)"
					:text="statusLabel(item.data) ?? ''"
					:clickable="false"
				/>
			</template>
		</N8nDropdownMenu>
	</N8nTooltip>
</template>

<style lang="scss" module>
// Same trigger as the dependency pill on workflow cards.
.badge {
	cursor: pointer;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text);

	&:hover {
		background-color: var(--background--hover);
	}

	:global([aria-expanded='true']) & {
		background-color: var(--background--active);
	}
}

.badgeText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	line-height: calc(var(--font-size--sm) + 1px);
}
</style>
