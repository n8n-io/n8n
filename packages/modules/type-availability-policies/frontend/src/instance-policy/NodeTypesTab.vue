<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue';

import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { FALLBACK_NODE_TYPE_ICON, nodeTypeIcon } from './nodeTypeIcon';
import { useInstancePolicy } from './useInstancePolicy';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import { visibleNodeTypes } from './visibleNodeTypes';
import { useAppliedTheme } from '../composables/useAppliedTheme';
import { fetchNodeTypeSummaries, type NodeTypeSummary } from '../type-availability-policies.api';

const emit = defineEmits<{ open: [name: string] }>();

const i18n = useI18n();
const rootStore = useRootStore();
const theme = useAppliedTheme();
const instancePolicy = useInstancePolicy();
const { types, loading, changeAccess } = useInstanceTypeAccess('node');

// `null` until the summaries load. Until then the tab cannot tell hidden node types from rows.
const typeSummaries = shallowRef<ReadonlyMap<string, NodeTypeSummary> | null>(null);

// Kept apart from the rows, so that a change of access does not resolve every icon again.
const decorations = computed(() => {
	const byName = new Map<string, Pick<InstancePolicyTableRow, 'displayName' | 'icon'>>();
	for (const [name, summary] of typeSummaries.value ?? []) {
		byName.set(name, {
			displayName: summary.displayName,
			icon: nodeTypeIcon(summary, theme.value, rootStore.baseUrl),
		});
	}
	return byName;
});

const rows = computed<InstancePolicyTableRow[]>(() => {
	const summaries = typeSummaries.value;
	if (!summaries) return [];

	return (
		visibleNodeTypes(types.value, summaries, instancePolicy.policies.node?.rules ?? [])
			// An unknown one shows its name, as the Credential types tab does.
			.map((type) => ({
				...type,
				...(decorations.value.get(type.name) ?? {
					displayName: type.name,
					icon: FALLBACK_NODE_TYPE_ICON,
				}),
				usage: instancePolicy.usageOf('node', type.name),
			}))
	);
});

async function loadSummaries() {
	try {
		typeSummaries.value = await fetchNodeTypeSummaries(rootStore.baseUrl);
	} catch {
		// The rows show the type names and a generic icon instead. Without the summaries the tab
		// cannot tell which types are hidden, so it shows them too.
		typeSummaries.value = new Map();
	}
}

onMounted(async () => {
	await Promise.all([loadSummaries(), instancePolicy.loadUsage('node')]);
});

const table = useTemplateRef<InstanceType<typeof InstancePolicyTable>>('table');

defineExpose({ returnFocus: (name: string | undefined) => table.value?.returnFocus(name) });
</script>

<template>
	<InstancePolicyTable
		ref="table"
		:rows="rows"
		:loading="loading || typeSummaries === null"
		:search-placeholder="i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.search.node')"
		data-test-id="node-types-tab"
		@change="changeAccess"
		@open="(name) => emit('open', name)"
	>
		<template #toolbar-start>
			<slot name="toolbar-start" />
		</template>
	</InstancePolicyTable>
</template>
