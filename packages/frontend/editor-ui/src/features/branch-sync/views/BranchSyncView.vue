<script lang="ts" setup>
import { N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import { useBranchSyncStore } from '@/features/branch-sync/branchSync.store';
import ConnectScopeDialog from '@/features/branch-sync/components/ConnectScopeDialog.vue';
import ScopeDetail from '@/features/branch-sync/components/ScopeDetail.vue';
import ScopesSidebar from '@/features/branch-sync/components/ScopesSidebar.vue';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const store = useBranchSyncStore();

const { scopes, selectedScopeKey, selected, loading, initialized } = storeToRefs(store);

const showConnectDialog = ref(false);

const detailTitle = computed(
	() => selected.value?.scopeKey ?? i18n.baseText('branchSync.page.title'),
);

documentTitle.set(i18n.baseText('branchSync.page.title'));

onMounted(async () => {
	try {
		await store.fetchScopes();
	} catch (error) {
		toast.showError(error, i18n.baseText('branchSync.error.load'));
	}
});
</script>

<template>
	<PageViewLayout data-test-id="branch-sync-view">
		<div :class="$style.content">
			<ScopesSidebar
				:scopes="scopes"
				:selected-scope-key="selectedScopeKey"
				:loading="loading"
				@select="store.select"
				@connect="showConnectDialog = true"
			/>

			<div :class="$style.main">
				<div :class="$style.columnTitle">
					<N8nHeading bold tag="h2" size="xlarge" data-test-id="branch-sync-detail-title">
						{{ detailTitle }}
					</N8nHeading>
				</div>

				<div :class="$style.mainBody">
					<N8nLoading v-if="!initialized" :loading="true" :rows="3" />
					<ScopeDetail v-else-if="selected" :scope="selected" />
					<N8nText v-else color="text-light" size="medium" data-test-id="branch-sync-no-selection">
						{{
							scopes.length === 0
								? i18n.baseText('branchSync.emptyState.body')
								: i18n.baseText('branchSync.noSelection.body')
						}}
					</N8nText>
				</div>
			</div>
		</div>

		<ConnectScopeDialog v-model:open="showConnectDialog" />
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	width: 100%;
	min-height: 0;
	height: 100%;
	overflow: hidden;
}

.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	padding: 0 0 var(--spacing--md) var(--spacing--md);
}

.columnTitle {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

.mainBody {
	flex: 1;
	min-height: 0;
	overflow: auto;
}
</style>
