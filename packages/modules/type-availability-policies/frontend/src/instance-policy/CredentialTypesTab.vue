<script setup lang="ts">
import type { CredentialTypeUsageResponse, TypeUsage } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, shallowRef } from 'vue';

import { credentialTypeIcon, FALLBACK_TYPE_ICON } from './credentialTypeIcon';
import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { setTypeAccess } from './setTypeAccess';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import { useAppliedTheme } from '../composables/useAppliedTheme';
import {
	fetchCredentialTypeSummaries,
	fetchCredentialTypeUsage,
	type CredentialTypeSummary,
} from '../type-availability-policies.api';

const NO_USAGE: TypeUsage = { uses: 0, workflows: 0, activeWorkflows: 0, projects: 0 };

const i18n = useI18n();
const rootStore = useRootStore();
const theme = useAppliedTheme();
const { types, loading, changeAccess } = useInstanceTypeAccess('credential', setTypeAccess);

const typeSummaries = shallowRef(new Map<string, CredentialTypeSummary>());
const usage = shallowRef<CredentialTypeUsageResponse | null>(null);

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
		usage: usage.value === null ? null : (usage.value[type.name] ?? NO_USAGE),
	})),
);

async function loadSummaries() {
	try {
		typeSummaries.value = await fetchCredentialTypeSummaries(rootStore.baseUrl);
	} catch {
		// The rows show the type names and a generic icon instead.
	}
}

async function loadUsage() {
	try {
		usage.value = await fetchCredentialTypeUsage(rootStore.restApiContext);
	} catch {
		// The usage cells show no value instead.
	}
}

onMounted(async () => {
	await Promise.all([loadSummaries(), loadUsage()]);
});
</script>

<template>
	<InstancePolicyTable
		:rows="rows"
		:loading="loading"
		:search-placeholder="
			i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.search.credential')
		"
		data-test-id="credential-types-tab"
		@change="changeAccess"
	>
		<template #toolbar-start>
			<slot name="toolbar-start" />
		</template>
	</InstancePolicyTable>
</template>
