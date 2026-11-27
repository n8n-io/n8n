<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue';

import { catalogNodeIcon, catalogNodeOf } from './communityNode';
import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { FALLBACK_NODE_TYPE_ICON, nodeTypeIcon } from './nodeTypeIcon';
import { useInstancePolicy } from './useInstancePolicy';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import { useAppliedTheme } from '../composables/useAppliedTheme';
import { fetchNodeTypeSummaries, type NodeTypeSummary } from '../type-availability-policies.api';

const emit = defineEmits<{ open: [name: string] }>();

const i18n = useI18n();
const rootStore = useRootStore();
const theme = useAppliedTheme();
const instancePolicy = useInstancePolicy();
const { types, loading, changeAccess, selection, bulkBusy, bulkChange } =
	useInstanceTypeAccess('node');

// `null` until the summaries load, so that the rows do not show type names first.
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

// Changes only with a new read of the access, not with each change of access.
const catalogDecorations = computed(() => {
	const byName = new Map<string, Pick<InstancePolicyTableRow, 'displayName' | 'icon'>>();
	for (const type of instancePolicy.typeAccess.node?.types.values() ?? []) {
		const catalogNode = catalogNodeOf(type);
		if (!catalogNode) continue;
		byName.set(type.name, {
			displayName: catalogNode.displayName,
			icon: catalogNodeIcon(catalogNode, theme.value),
		});
	}
	return byName;
});

const rows = computed<InstancePolicyTableRow[]>(() => {
	const summaries = typeSummaries.value;
	if (!summaries) return [];

	return types.value.map((type) => {
		const catalogDecoration = catalogDecorations.value.get(type.name);
		// A node that is not installed has no usage of its own to count.
		if (catalogDecoration) return { ...type, ...catalogDecoration, usage: null };

		// An unknown one shows its name, as the Credential types tab does.
		return {
			...type,
			...(decorations.value.get(type.name) ?? {
				displayName: type.name,
				icon: FALLBACK_NODE_TYPE_ICON,
			}),
			usage: instancePolicy.usageOf('node', type.name),
		};
	});
});

async function loadSummaries() {
	try {
		typeSummaries.value = await fetchNodeTypeSummaries(rootStore.baseUrl);
	} catch {
		// The rows show the type names and a generic icon instead.
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
		v-model:selection="selection"
		:rows="rows"
		:bulk-busy="bulkBusy"
		:loading="loading || typeSummaries === null"
		:search-placeholder="i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.search.node')"
		:no-match-text="i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.noMatch.node')"
		show-source
		data-test-id="node-types-tab"
		@change="changeAccess"
		@bulk-change="bulkChange"
		@open="(name) => emit('open', name)"
	>
		<template #toolbar-start>
			<slot name="toolbar-start" />
		</template>
	</InstancePolicyTable>
</template>
