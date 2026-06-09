<script setup lang="ts">
// PROTOTYPE: card body for a trigger node when a trigger-card variant is active.
// Icon on the left, editable title on the right; when the variant opts in (V3)
// the trigger's rules render beneath as editable "Parameters". Edits persist to
// a localStorage override (usePrototypeNodeCard) and do not touch the real node.
import { computed } from 'vue';
import { N8nInlineTextEdit } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import type { NodeIconSource } from '@/app/utils/nodeIcon';
import { usePrototypeNodeCard } from './usePrototypeNodeCard';
import { useGroupCardVariant } from '../group-card-variants/useGroupCardVariant';
import type { GroupParamConfig } from '../group-card-variants/v3Config';
import GroupParamRow from '../group-card-variants/GroupParamRow.vue';

const props = withDefaults(
	defineProps<{
		nodeId: string;
		nodeName: string;
		iconSource: NodeIconSource | undefined;
		isReadOnly?: boolean;
	}>(),
	{ isReadOnly: false },
);

const { title, setTitle } = usePrototypeNodeCard(
	() => props.nodeId,
	() => props.nodeName,
);

// PROTOTYPE: when the active variant opts in (V3), surface the trigger's rules
// beneath the title, editable exactly like the group params.
const { activeVariant } = useGroupCardVariant();
const showRules = computed(() => !!activeVariant.value.triggerRules);
const rulesLabel = 'Parameters';

// GroupParamRow resolves a param's `source.nodeName` to a node id; for the
// trigger that's just this node.
const nodeIdByName = computed<Record<string, string>>(() => ({ [props.nodeName]: props.nodeId }));

// Schedule-trigger rule fields, read live from the node and mock-editable.
const ruleParams = computed<GroupParamConfig[]>(() => [
	{
		id: 'trigger-interval',
		label: 'Trigger interval',
		type: 'select',
		options: ['seconds', 'minutes', 'hours', 'days', 'weeks'],
		source: { nodeName: props.nodeName, parameterPath: 'rule.interval.0.field' },
		fallback: 'minutes',
	},
	{
		id: 'minutes-between',
		label: 'Minutes between triggers',
		type: 'text',
		source: { nodeName: props.nodeName, parameterPath: 'rule.interval.0.minutesInterval' },
		fallback: '1',
	},
]);

function onTitleUpdate(value: string) {
	setTitle(value);
}
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.iconWrapper">
			<NodeIcon :icon-source="iconSource" :size="24" :shrink="false" />
		</div>
		<div :class="$style.textBlock">
			<div :class="$style.title" data-test-id="trigger-card-title">
				<N8nInlineTextEdit
					:model-value="title"
					:read-only="isReadOnly"
					:min-width="0"
					max-width="100%"
					@update:model-value="onTitleUpdate"
					@mousedown.stop
				/>
			</div>

			<div v-if="showRules" :class="$style.rules">
				<span :class="$style.sectionLabel">{{ rulesLabel }}</span>
				<GroupParamRow
					v-for="rule in ruleParams"
					:key="rule.id"
					:param="rule"
					:group-id="nodeId"
					:node-id-by-name="nodeIdByName"
					:is-read-only="isReadOnly"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--md);
	box-sizing: border-box;
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.textBlock {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	display: flex;
	align-items: center;
	min-width: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}

.rules {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--2xs);
}

.sectionLabel {
	margin-bottom: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color--text--tint-1);
}
</style>
