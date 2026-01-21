<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import { N8nHeading, N8nTabs, N8nButton, N8nLoading } from '@n8n/design-system';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import PoliciesTab from '../components/PoliciesTab.vue';
import CategoriesTab from '../components/CategoriesTab.vue';
import RequestsTab from '../components/RequestsTab.vue';

const { showError } = useToast();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const { loading, pendingRequestCount } = storeToRefs(nodeGovernanceStore);

const activeTab = ref('policies');

const tabs = computed(() => [
	{
		name: 'policies',
		label: i18n.baseText('nodeGovernance.tabs.policies'),
	},
	{
		name: 'categories',
		label: i18n.baseText('nodeGovernance.tabs.categories'),
	},
	{
		name: 'requests',
		label: i18n.baseText('nodeGovernance.tabs.requests'),
		badge: pendingRequestCount.value > 0 ? String(pendingRequestCount.value) : undefined,
	},
]);

onMounted(async () => {
	documentTitle.set(i18n.baseText('nodeGovernance.title'));

	try {
		await Promise.all([
			nodeGovernanceStore.fetchPolicies(),
			nodeGovernanceStore.fetchCategories(),
			nodeGovernanceStore.fetchPendingRequests(),
		]);
	} catch (error) {
		showError(error, i18n.baseText('nodeGovernance.error.load'));
	}
});

function onTabChange(tabName: string) {
	activeTab.value = tabName;
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('nodeGovernance.title') }}
			</N8nHeading>
		</div>

		<p :class="$style.description">
			{{ i18n.baseText('nodeGovernance.description') }}
		</p>

		<N8nTabs
			:model-value="activeTab"
			:options="tabs"
			@update:model-value="onTabChange"
		/>

		<div :class="$style.content">
			<N8nLoading v-if="loading" :rows="5" variant="p" />

			<template v-else>
				<PoliciesTab v-if="activeTab === 'policies'" />
				<CategoriesTab v-if="activeTab === 'categories'" />
				<RequestsTab v-if="activeTab === 'requests'" />
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing-l);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-s);
}

.description {
	color: var(--color-text-base);
	margin-bottom: var(--spacing-l);
}

.content {
	margin-top: var(--spacing-l);
}
</style>
