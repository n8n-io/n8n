<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue';

import { credentialTypeIcon, FALLBACK_TYPE_ICON } from './credentialTypeIcon';
import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { useInstancePolicy } from './useInstancePolicy';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import { useAppliedTheme } from '../composables/useAppliedTheme';
import {
	fetchCredentialTypeSummaries,
	type CredentialTypeSummary,
} from '../type-availability-policies.api';

const emit = defineEmits<{ open: [name: string] }>();

const i18n = useI18n();
const rootStore = useRootStore();
const theme = useAppliedTheme();
const instancePolicy = useInstancePolicy();
const { types, loading, changeAccess } = useInstanceTypeAccess('credential');

const typeSummaries = shallowRef(new Map<string, CredentialTypeSummary>());

// Kept apart from the rows, so that a change of access does not resolve every icon again.
const decorations = computed(() => {
	const byName = new Map<string, Pick<InstancePolicyTableRow, 'displayName' | 'icon'>>();
	for (const [name, summary] of typeSummaries.value) {
		byName.set(name, {
			displayName: summary.displayName,
			icon:
				credentialTypeIcon(typeSummaries.value, name, theme.value, rootStore.baseUrl) ??
				FALLBACK_TYPE_ICON,
		});
	}
	return byName;
});

const rows = computed<InstancePolicyTableRow[]>(() =>
	types.value.map((type) => ({
		...type,
		...(decorations.value.get(type.name) ?? { displayName: type.name, icon: FALLBACK_TYPE_ICON }),
		usage: instancePolicy.usageOf('credential', type.name),
	})),
);

async function loadSummaries() {
	try {
		typeSummaries.value = await fetchCredentialTypeSummaries(rootStore.baseUrl);
	} catch {
		// The rows show the type names and a generic icon instead.
	}
}

onMounted(async () => {
	await Promise.all([loadSummaries(), instancePolicy.loadUsage('credential')]);
});

const table = useTemplateRef<InstanceType<typeof InstancePolicyTable>>('table');

defineExpose({ returnFocus: (name: string | undefined) => table.value?.returnFocus(name) });
</script>

<template>
	<InstancePolicyTable
		ref="table"
		:rows="rows"
		:loading="loading"
		:search-placeholder="
			i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.search.credential')
		"
		:no-match-text="
			i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.noMatch.credential')
		"
		data-test-id="credential-types-tab"
		@change="changeAccess"
		@open="(name) => emit('open', name)"
	>
		<template #toolbar-start>
			<slot name="toolbar-start" />
		</template>
	</InstancePolicyTable>
</template>
