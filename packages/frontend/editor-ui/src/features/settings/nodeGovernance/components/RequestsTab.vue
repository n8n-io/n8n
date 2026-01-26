<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { storeToRefs } from 'pinia';

import {
	N8nActionBox,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nInput,
	N8nPagination2,
	N8nRecycleScroller,
	N8nText,
} from '@n8n/design-system';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeAccessRequest } from '../nodeGovernance.api';
import { APPROVE_REQUEST_MODAL_KEY, REJECT_REQUEST_MODAL_KEY } from '../nodeGovernance.constants';

const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const { pendingRequests } = storeToRefs(nodeGovernanceStore);

const searchQuery = ref('');

// Pagination state (1-indexed for N8nPagination)
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filteredRequests = computed(() => {
	if (!pendingRequests.value || pendingRequests.value.length === 0) {
		return [];
	}
	if (!searchQuery.value.trim()) {
		return pendingRequests.value;
	}
	const query = searchQuery.value.toLowerCase();
	return pendingRequests.value.filter(
		(r) =>
			r.nodeType.toLowerCase().includes(query) ||
			r.requestedBy?.email?.toLowerCase().includes(query) ||
			r.project?.name?.toLowerCase().includes(query) ||
			r.justification?.toLowerCase().includes(query),
	);
});

// Ref for list container to enable scroll-to-top
const listContainerRef = ref<HTMLElement | null>(null);

// Estimated card height for virtual scrolling (will auto-adjust)
const estimatedCardHeight = 180;

// Reset page to 1 when search query changes
watch(searchQuery, () => {
	currentPage.value = 1;
});

// Auto-scroll to top when page changes
watch(currentPage, () => {
	void nextTick(() => {
		if (listContainerRef.value) {
			const container = listContainerRef.value.querySelector(
				'.recycle-scroller-wrapper',
			) as HTMLElement;
			if (container) {
				container.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
	});
});

// Compute paginated items
const paginatedRequests = computed(() => {
	if (!filteredRequests.value || filteredRequests.value.length === 0) {
		return [];
	}
	const start = (currentPage.value - 1) * itemsPerPage.value;
	const end = start + itemsPerPage.value;
	return filteredRequests.value.slice(start, end);
});

function handlePageChange(page: number) {
	currentPage.value = page;
}

function handlePageSizeChange(size: number) {
	itemsPerPage.value = size;
	currentPage.value = 1;
}

function onReviewRequest(request: NodeAccessRequest, action: 'approve' | 'reject') {
	if (action === 'approve') {
		uiStore.openModalWithData({
			name: APPROVE_REQUEST_MODAL_KEY,
			data: { request },
		});
	} else {
		uiStore.openModalWithData({
			name: REJECT_REQUEST_MODAL_KEY,
			data: { request },
		});
	}
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function getRequesterName(request: NodeAccessRequest): string {
	if (request.requestedBy?.firstName && request.requestedBy?.lastName) {
		return `${request.requestedBy.firstName} ${request.requestedBy.lastName}`;
	}
	return request.requestedBy?.email ?? i18n.baseText('nodeGovernance.requests.unknownUser');
}

function getNodeDisplayName(nodeType: string): string {
	const parts = nodeType.split('.');
	return parts[parts.length - 1] || nodeType;
}
</script>

<template>
	<div :class="$style.requestsTab">
		<!-- Search Row -->
		<div :class="$style.headerRow">
			<N8nInput
				v-model="searchQuery"
				:class="$style.searchInput"
				:placeholder="i18n.baseText('nodeGovernance.requests.search')"
				clearable
				data-test-id="requests-search"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('nodeGovernance.requests.pendingCount', {
						interpolate: { count: filteredRequests.length },
						adjustToNumber: filteredRequests.length,
					})
				}}
			</N8nText>
		</div>

		<!-- Empty State -->
		<N8nActionBox
			v-if="pendingRequests.length === 0"
			:heading="i18n.baseText('nodeGovernance.requests.empty.title')"
			:description="i18n.baseText('nodeGovernance.requests.empty.description')"
		/>

		<!-- Request Cards List -->
		<div v-else ref="listContainerRef" :class="$style.requestListWrapper">
			<N8nRecycleScroller
				v-if="paginatedRequests.length > 0"
				:items="paginatedRequests"
				:item-size="estimatedCardHeight"
				item-key="id"
			>
				<template #default="{ item: request }">
					<N8nCard :class="$style.requestCard">
						<template #header>
							<div :class="$style.cardHeader">
								<N8nText tag="h2" :bold="true" size="medium">{{
									getNodeDisplayName(request.nodeType)
								}}</N8nText>
								<N8nBadge theme="warning" :class="$style.statusBadge">
									{{ i18n.baseText('nodeGovernance.requests.status.pending') }}
								</N8nBadge>
							</div>
						</template>
						<div :class="$style.cardBody">
							<N8nText color="text-light" size="small">{{ request.nodeType }}</N8nText>
							<N8nText color="text-light" size="small" :class="$style.justification">
								{{
									request.justification || i18n.baseText('nodeGovernance.requests.noJustification')
								}}
							</N8nText>
						</div>
						<template #append>
							<div :class="$style.cardAppend">
								<div :class="$style.metaInfo">
									<N8nText size="small">{{ getRequesterName(request) }}</N8nText>
									<N8nBadge :class="$style.projectBadge">
										{{ request.project?.name || request.projectId }}
									</N8nBadge>
									<N8nText size="small" color="text-light">{{
										formatDate(request.createdAt)
									}}</N8nText>
								</div>
								<div :class="$style.cardActions">
									<N8nButton
										type="success"
										size="small"
										icon="check"
										:class="$style.approveBtn"
										data-test-id="approve-request-button"
										@click="onReviewRequest(request, 'approve')"
									>
										{{ i18n.baseText('nodeGovernance.requests.action.approve') }}
									</N8nButton>
									<N8nButton
										type="danger"
										size="small"
										icon="times"
										:class="$style.rejectBtn"
										data-test-id="reject-request-button"
										@click="onReviewRequest(request, 'reject')"
									>
										{{ i18n.baseText('nodeGovernance.requests.action.reject') }}
									</N8nButton>
								</div>
							</div>
						</template>
					</N8nCard>
				</template>
			</N8nRecycleScroller>
			<div v-else :class="$style.emptyState">
				<N8nText color="text-light">{{
					i18n.baseText('nodeGovernance.requests.noResults')
				}}</N8nText>
			</div>
		</div>

		<!-- Pagination -->
		<div
			v-if="filteredRequests.length > itemsPerPage && itemsPerPage > 0"
			:class="$style.paginationContainer"
		>
			<N8nPagination2
				:current-page="Math.max(1, currentPage)"
				:page-size="itemsPerPage"
				:total="filteredRequests.length"
				:page-sizes="[10, 25, 50]"
				layout="prev, pager, next, sizes"
				@update:current-page="handlePageChange"
				@update:pageSize="handlePageSizeChange"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.requestsTab {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.headerRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) 0;
	margin-bottom: var(--spacing--sm);
	border-bottom: 1px solid var(--color--foreground);
}

.searchInput {
	max-width: 220px;
}

.requestListWrapper {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	position: relative;
	height: 100%;
}

.requestCard {
	width: 100%;
	margin-bottom: var(--spacing--2xs);
	transition: border-color 0.15s;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}

	:global(.n8n-card-append) {
		padding-left: var(--spacing--sm);
	}
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.statusBadge {
	flex-shrink: 0;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.justification {
	font-style: italic;
}

.cardAppend {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.metaInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.projectBadge {
	flex-shrink: 0;
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.approveBtn {
	--button--font--color: var(--color--success);

	&:hover {
		--button--background--color: var(--color--success--tint-3);
	}
}

.rejectBtn {
	--button--font--color: var(--color--danger);

	&:hover {
		--button--background--color: var(--color--danger--tint-3);
	}
}

.paginationContainer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: var(--spacing--sm);
	padding-top: var(--spacing--sm);
}
</style>
