<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { storeToRefs } from 'pinia';

import { N8nButton, N8nHeading, N8nIcon, N8nLoading, N8nNotice, N8nText } from '@n8n/design-system';

import { useNodeGovernanceStore } from '../nodeGovernance.store';
import PoliciesTab from '../components/PoliciesTab.vue';
import CategoriesTab from '../components/CategoriesTab.vue';
import RequestsTab from '../components/RequestsTab.vue';
import { POLICY_FORM_MODAL_KEY, CATEGORY_FORM_MODAL_KEY } from '../nodeGovernance.constants';

const { showError } = useToast();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const { loading, pendingRequestCount } = storeToRefs(nodeGovernanceStore);

const activeTab = ref<'policies' | 'categories' | 'requests'>('policies');

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

function setTab(tab: 'policies' | 'categories' | 'requests') {
	activeTab.value = tab;
}

function onRefresh() {
	void nodeGovernanceStore.fetchPolicies();
	void nodeGovernanceStore.fetchCategories();
	void nodeGovernanceStore.fetchPendingRequests();
}

function onAddPolicy() {
	uiStore.openModalWithData({
		name: POLICY_FORM_MODAL_KEY,
		data: {},
	});
}

function onAddCategory() {
	uiStore.openModalWithData({
		name: CATEGORY_FORM_MODAL_KEY,
		data: {},
	});
}
</script>

<template>
	<div :class="$style.container">
		<!-- Page Header -->
		<N8nHeading tag="h1" size="2xlarge" class="mb-m">
			{{ i18n.baseText('nodeGovernance.title') }}
		</N8nHeading>
		<N8nText color="text-light" class="mb-l">
			{{ i18n.baseText('nodeGovernance.description') }}
			<a
				href="https://docs.n8n.io"
				target="_blank"
				rel="noopener noreferrer"
				:class="$style.link"
				>{{ i18n.baseText('generic.learnMore') }}</a
			>
		</N8nText>

		<!-- Priority Notice -->
		<N8nNotice type="warning" class="mb-m">
			<strong>{{ i18n.baseText('nodeGovernance.priority.title') }}:</strong>
			{{ i18n.baseText('nodeGovernance.priority.description') }}
		</N8nNotice>

		<!-- Controls Row -->
		<div :class="$style.controlsRow">
			<N8nButton
				v-if="activeTab === 'policies'"
				type="primary"
				icon="plus"
				data-test-id="add-policy-button"
				@click="onAddPolicy"
			>
				{{ i18n.baseText('nodeGovernance.addPolicy') }}
			</N8nButton>
			<N8nButton
				v-else-if="activeTab === 'categories'"
				type="primary"
				icon="plus"
				data-test-id="add-category-button"
				@click="onAddCategory"
			>
				{{ i18n.baseText('nodeGovernance.createCategory') }}
			</N8nButton>
		</div>

		<!-- Tabs -->
		<div :class="$style.tabsContainer">
			<div :class="$style.tabs">
				<button
					:class="[$style.tab, { [$style.tabActive]: activeTab === 'policies' }]"
					data-test-id="tab-policies"
					@click="setTab('policies')"
				>
					{{ i18n.baseText('nodeGovernance.tabs.policies') }}
				</button>
				<button
					:class="[$style.tab, { [$style.tabActive]: activeTab === 'categories' }]"
					data-test-id="tab-categories"
					@click="setTab('categories')"
				>
					{{ i18n.baseText('nodeGovernance.tabs.categories') }}
				</button>
				<button
					:class="[$style.tab, { [$style.tabActive]: activeTab === 'requests' }]"
					data-test-id="tab-requests"
					@click="setTab('requests')"
				>
					{{ i18n.baseText('nodeGovernance.tabs.requests') }}
					<span v-if="pendingRequestCount > 0" :class="$style.tabBadge">{{
						pendingRequestCount
					}}</span>
				</button>
				<button
					:class="$style.refreshBtn"
					data-test-id="refresh-button"
					:title="i18n.baseText('generic.refresh')"
					@click="onRefresh"
				>
					<N8nIcon icon="sync" />
				</button>
			</div>
		</div>

		<!-- Tab Content -->
		<div :class="$style.tabContent">
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
	max-width: 100%;
}

.link {
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.controlsRow {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16px;
	margin: 20px 0;
}

.tabsContainer {
	border-bottom: 1px solid var(--color--foreground);
	margin-bottom: 0;
}

.tabs {
	display: flex;
	align-items: center;
}

.tab {
	padding: 12px 18px;
	color: var(--color--text--tint-1);
	cursor: pointer;
	border: none;
	background: none;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	font-weight: 500;
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	transition: color 0.15s;

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.tabActive {
	color: var(--color--primary);
	border-bottom-color: var(--color--primary);
}

.tabBadge {
	background: var(--color--primary);
	color: #fff;
	font-size: 11px;
	padding: 2px 7px;
	border-radius: 10px;
	font-weight: 600;
}

.refreshBtn {
	margin-left: auto;
	padding: 8px;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		background: var(--color--background--light-3);
	}
}

.tabContent {
	padding-top: 20px;
	min-height: 400px;
}
</style>
