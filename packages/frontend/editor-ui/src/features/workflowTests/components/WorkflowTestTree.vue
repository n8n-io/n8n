<script setup lang="ts">
import { N8nBadge, N8nCollapsiblePanel, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	TEST_STATUS_DISPLAY,
	type WorkflowTestGroup,
	type WorkflowTestRow,
	type WorkflowTestTreeItem,
} from '../workflowTests.display';
import WorkflowTestResultRow from './WorkflowTestResultRow.vue';

/** Lists tests and `describe` groups. A group nests its children inside its panel. */
defineProps<{
	items: WorkflowTestTreeItem[];
	/** Whether a group or a test is open, by full name. */
	isExpanded: (item: WorkflowTestTreeItem) => boolean;
	canOpenNode: (row: WorkflowTestRow) => boolean;
	canFix: boolean;
}>();

const emit = defineEmits<{
	toggle: [fullName: string, expanded: boolean];
	fix: [row: WorkflowTestRow];
	showCode: [];
	openNode: [node: string];
}>();

const i18n = useI18n();

const COUNT_LABELS = {
	failed: 'workflowTests.summary.failed',
	skipped: 'workflowTests.summary.skipped',
	notRun: 'workflowTests.summary.notRun',
} as const;

/** The counts shown on a group header. The passed count is the fraction next to them. */
function groupBadges(group: WorkflowTestGroup) {
	return (['failed', 'skipped', 'notRun'] as const)
		.filter((status) => group.counts[status] > 0)
		.map((status) => ({
			status,
			variant: TEST_STATUS_DISPLAY[status].badge,
			label: i18n.baseText(COUNT_LABELS[status], {
				interpolate: { count: String(group.counts[status]) },
			}),
		}));
}
</script>

<template>
	<div :class="$style.list">
		<template v-for="item in items" :key="item.fullName">
			<N8nCollapsiblePanel
				v-if="item.kind === 'group'"
				:model-value="isExpanded(item)"
				:show-actions-on-hover="false"
				:class="$style.group"
				data-testid="workflow-tests-group"
				@update:model-value="emit('toggle', item.fullName, $event)"
			>
				<template #title>
					<span :class="$style.title">
						<N8nIcon
							:icon="TEST_STATUS_DISPLAY[item.status].icon"
							:spin="item.status === 'running'"
							:class="[$style.statusIcon, $style[item.status]]"
							size="medium"
						/>
						<N8nIcon icon="list-tree" size="small" :class="$style.groupIcon" />
						<N8nText size="small" bold :class="$style.name">{{ item.name }}</N8nText>
					</span>
				</template>
				<template #actions>
					<N8nBadge
						v-for="badge in groupBadges(item)"
						:key="badge.status"
						:variant="badge.variant"
						size="xsmall"
					>
						{{ badge.label }}
					</N8nBadge>
					<N8nText size="xsmall" color="text-light" :class="$style.count">
						{{ item.counts.passed }}/{{ item.counts.total }}
					</N8nText>
				</template>

				<WorkflowTestTree
					:items="item.children"
					:is-expanded="isExpanded"
					:can-open-node="canOpenNode"
					:can-fix="canFix"
					@toggle="(name, value) => emit('toggle', name, value)"
					@fix="emit('fix', $event)"
					@show-code="emit('showCode')"
					@open-node="emit('openNode', $event)"
				/>
			</N8nCollapsiblePanel>

			<WorkflowTestResultRow
				v-else
				:row="item"
				:expanded="isExpanded(item)"
				:can-open-node="canOpenNode(item)"
				:can-fix="canFix"
				@update:expanded="emit('toggle', item.fullName, $event)"
				@fix="emit('fix', item)"
				@show-code="emit('showCode')"
				@open-node="emit('openNode', $event)"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	// N8nCollapsiblePanel spaces sibling panels itself; the list gap does it here.
	> * + * {
		margin-top: 0;
	}
}

.group {
	background-color: var(--color--background--light-2);

	// See WorkflowTestResultRow: a long name must shrink, not push the counts out.
	> div:first-child > button > span {
		flex-shrink: 1;
		min-width: 0;
	}
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--3xs) 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.groupIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.statusIcon.passed {
	color: var(--color--success);
}

.statusIcon.failed {
	color: var(--color--danger);
}

.statusIcon.running {
	color: var(--color--primary);
}

.count {
	white-space: nowrap;
}
</style>
