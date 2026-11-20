<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, shallowRef } from 'vue';

import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { FALLBACK_NODE_TYPE_ICON, nodeTypeIcon } from './nodeTypeIcon';
import { setTypeAccess } from './setTypeAccess';
import { useInstancePolicy } from './useInstancePolicy';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import { useAppliedTheme } from '../composables/useAppliedTheme';
import { fetchNodeTypeSummaries, type NodeTypeSummary } from '../type-availability-policies.api';

const i18n = useI18n();
const rootStore = useRootStore();
const theme = useAppliedTheme();
const instancePolicy = useInstancePolicy();
const { types, loading, changeAccess } = useInstanceTypeAccess('node', setTypeAccess);

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

// The access list reloads after a save, so it can name a rule that the policy no longer has. Only
// a known broader rule hides a row, so such a rule keeps the row until the reload.
const broaderRuleIds = computed(
	() =>
		new Set(
			(instancePolicy.policies.node?.rules ?? []).flatMap((rule) =>
				rule.selector.kind === 'name' ? [] : [rule.id],
			),
		),
);

const rows = computed<InstancePolicyTableRow[]>(() => {
	const summaries = typeSummaries.value;
	if (!summaries) return [];

	// A hidden node type gets no row, unless a `name` rule decides it: the admin must see that rule
	// to undo it. The default action or a broader rule, such as one for its package, keeps it hidden.
	return (
		types.value
			.filter(
				(type) =>
					!summaries.get(type.name)?.hidden ||
					(type.matchedRuleId !== null && !broaderRuleIds.value.has(type.matchedRuleId)),
			)
			// An unknown one shows its name, as the Credential types tab does.
			.map((type) => ({
				...type,
				...(decorations.value.get(type.name) ?? {
					displayName: type.name,
					icon: FALLBACK_NODE_TYPE_ICON,
				}),
				// No route counts the node type usage yet, so the usage cells show no value.
				usage: null,
			}))
	);
});

onMounted(async () => {
	try {
		typeSummaries.value = await fetchNodeTypeSummaries(rootStore.baseUrl);
	} catch {
		// The rows show the type names and a generic icon instead. Without the summaries the tab
		// cannot tell which types are hidden, so it shows them too.
		typeSummaries.value = new Map();
	}
});
</script>

<template>
	<InstancePolicyTable
		:rows="rows"
		:loading="loading || typeSummaries === null"
		:search-placeholder="i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.search.node')"
		data-test-id="node-types-tab"
		@change="changeAccess"
	>
		<template #toolbar-start>
			<slot name="toolbar-start" />
		</template>
	</InstancePolicyTable>
</template>
