<script lang="ts" setup>
import { N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ConflictChoices, Decision } from '@/features/branch-sync/branchSync.types';
import {
	getConflictReasonLabel,
	getDecisionDisplayName,
	getResourceKind,
} from '@/features/branch-sync/branchSync.utils';
import ConflictChoice from '@/features/branch-sync/components/ConflictChoice.vue';
import DecisionKindBadge from '@/features/branch-sync/components/DecisionKindBadge.vue';

const props = defineProps<{
	decisions: Decision[];
	choices: ConflictChoices;
}>();

const emit = defineEmits<{
	'update:choices': [value: ConflictChoices];
}>();

/** Paths ticked for a partial apply (D009). Empty = full sync. */
const selection = defineModel<string[]>('selection', { default: () => [] });

const i18n = useI18n();

const headers = computed<Array<TableHeader<Decision>>>(() => [
	{ title: i18n.baseText('branchSync.table.name'), key: 'name', disableSort: true, resize: false },
	{
		title: i18n.baseText('branchSync.table.kind'),
		key: 'kind',
		width: 170,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('branchSync.table.changes'),
		key: 'changes',
		width: 90,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
	{
		title: i18n.baseText('branchSync.table.resolution'),
		key: 'resolution',
		width: 220,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);

// Rows that a partial apply can meaningfully include.
const selectableKinds = new Set(['apply-to-live', 'outgoing', 'conflict', 'deferred']);

function setChoice(path: string, choice: 'head' | 'live') {
	emit('update:choices', { ...props.choices, [path]: choice });
}
</script>

<template>
	<div data-test-id="branch-sync-plan-table">
		<N8nText v-if="decisions.length === 0" color="text-light" size="medium">
			{{ i18n.baseText('branchSync.table.empty') }}
		</N8nText>
		<N8nDataTableServer
			v-else
			v-model:selection="selection"
			:headers="headers"
			:items="decisions"
			:items-length="decisions.length"
			:page-sizes="[25, 50, 100]"
			show-select
			item-value="path"
			:item-selectable="(row: Decision) => selectableKinds.has(row.kind)"
		>
			<template #[`item.name`]="{ item }">
				<div :class="$style.nameCell">
					<N8nText size="small" bold>{{ getDecisionDisplayName(item) }}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ getResourceKind(item.path) }}
					</N8nText>
				</div>
			</template>
			<template #[`item.kind`]="{ item }">
				<DecisionKindBadge :decision="item" />
			</template>
			<template #[`item.changes`]="{ item }">
				<N8nText size="xsmall" color="text-light" :class="$style.mono">
					{{ item.g }}/{{ item.l }}
				</N8nText>
			</template>
			<template #[`item.resolution`]="{ item }">
				<div v-if="item.kind === 'conflict' && item.resolved === false" :class="$style.conflict">
					<ConflictChoice
						:model-value="choices[item.path]"
						@update:model-value="setChoice(item.path, $event)"
					/>
					<N8nText v-if="item.reason" size="xsmall" color="text-light">
						{{ getConflictReasonLabel(item.reason) }}
					</N8nText>
				</div>
				<N8nText v-else-if="item.op" size="xsmall" color="text-light">
					{{ item.op }}
				</N8nText>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.nameCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.mono {
	font-family: var(--font-family--monospace);
}

.conflict {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
