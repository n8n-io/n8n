<script setup lang="ts">
import { N8nIcon, N8nText, N8nVisuallyHidden } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	TEST_STATUS_DISPLAY,
	type WorkflowTestRow,
	type WorkflowTestTreeItem,
} from '../workflowTests.display';
import WorkflowTestResultRow from './WorkflowTestResultRow.vue';

/** Lists tests and `describe` groups. A group nests its children below its header. */
defineProps<{
	items: WorkflowTestTreeItem[];
	/** Whether a group or a test is open, by full name. */
	isExpanded: (item: WorkflowTestTreeItem) => boolean;
	canOpenNode: (row: WorkflowTestRow) => boolean;
	canFix: boolean;
	/** The full name of the test that the editor shows. */
	selectedName: string | undefined;
}>();

const emit = defineEmits<{
	toggle: [fullName: string, expanded: boolean];
	select: [row: WorkflowTestRow];
	fix: [row: WorkflowTestRow];
	openNode: [node: string];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.list">
		<template v-for="item in items" :key="item.fullName">
			<div
				v-if="item.kind === 'group'"
				:class="$style[item.status]"
				data-testid="workflow-tests-group"
			>
				<button
					type="button"
					:class="$style.header"
					:aria-expanded="isExpanded(item)"
					@click="emit('toggle', item.fullName, !isExpanded(item))"
				>
					<N8nIcon
						icon="chevron-right"
						size="small"
						:class="[$style.chevron, { [$style.open]: isExpanded(item) }]"
					/>
					<N8nIcon
						:key="item.status"
						:icon="TEST_STATUS_DISPLAY[item.status].icon"
						:class="$style.statusIcon"
						size="medium"
					/>
					<N8nVisuallyHidden>
						{{ i18n.baseText(TEST_STATUS_DISPLAY[item.status].label) }}
					</N8nVisuallyHidden>
					<N8nText size="small" bold :class="$style.name" :title="item.name">
						{{ item.name }}
					</N8nText>
					<N8nText size="xsmall" color="text-light" :class="$style.count">
						{{ item.counts.passed }}/{{ item.counts.total }}
					</N8nText>
				</button>

				<div v-if="isExpanded(item)" :class="$style.children">
					<WorkflowTestTree
						:items="item.children"
						:is-expanded="isExpanded"
						:can-open-node="canOpenNode"
						:can-fix="canFix"
						:selected-name="selectedName"
						@toggle="(name, value) => emit('toggle', name, value)"
						@select="emit('select', $event)"
						@fix="emit('fix', $event)"
						@open-node="emit('openNode', $event)"
					/>
				</div>
			</div>

			<WorkflowTestResultRow
				v-else
				:row="item"
				:expanded="isExpanded(item)"
				:selected="item.fullName === selectedName"
				:can-open-node="canOpenNode(item)"
				:can-fix="canFix"
				@select="emit('select', item)"
				@fix="emit('fix', item)"
				@open-node="emit('openNode', $event)"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.header {
	composes: row from './testRow.module.scss';
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.open {
	transform: rotate(90deg);
}

.children {
	// The guide line sits below the centre of the chevron.
	margin-left: calc(var(--spacing--2xs) + var(--spacing--3xs));
	padding-left: var(--spacing--2xs);
	border-left: var(--border);
}

.name {
	composes: name from './testRow.module.scss';
}

.statusIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);

	@include motion.fade-in;
}

.passed > .header .statusIcon {
	color: var(--color--success);
}

.failed > .header .statusIcon {
	color: var(--color--danger);
}

.running > .header .statusIcon {
	@include motion.opacity-pulse;
}

.count {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}
</style>
