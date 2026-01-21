<script lang="ts" setup>
import { ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import {
	N8nButton,
	N8nCard,
	N8nBadge,
	N8nText,
	N8nActionBox,
} from '@n8n/design-system';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeAccessRequest } from '../nodeGovernance.api';
import ReviewRequestModal from './ReviewRequestModal.vue';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const { pendingRequests } = storeToRefs(nodeGovernanceStore);

const showModal = ref(false);
const reviewingRequest = ref<NodeAccessRequest | null>(null);

function onReviewRequest(request: NodeAccessRequest) {
	reviewingRequest.value = request;
	showModal.value = true;
}

function onModalClose() {
	showModal.value = false;
	reviewingRequest.value = null;
}

async function onQuickApprove(request: NodeAccessRequest) {
	try {
		await nodeGovernanceStore.reviewRequest(request.id, {
			action: 'approve',
			createPolicy: true,
		});
		showMessage({
			title: i18n.baseText('nodeGovernance.requests.approve.success'),
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.requests.approve.error'));
	}
}

async function onQuickReject(request: NodeAccessRequest) {
	try {
		await nodeGovernanceStore.reviewRequest(request.id, {
			action: 'reject',
		});
		showMessage({
			title: i18n.baseText('nodeGovernance.requests.reject.success'),
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.requests.reject.error'));
	}
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function getRequesterName(request: NodeAccessRequest): string {
	if (request.requestedBy) {
		const { firstName, lastName, email } = request.requestedBy;
		if (firstName || lastName) {
			return `${firstName ?? ''} ${lastName ?? ''}`.trim();
		}
		return email;
	}
	return request.requestedById;
}
</script>

<template>
	<div :class="$style.container">
		<N8nActionBox
			v-if="pendingRequests.length === 0"
			:heading="i18n.baseText('nodeGovernance.requests.empty.title')"
			:description="i18n.baseText('nodeGovernance.requests.empty.description')"
		/>

		<div v-else :class="$style.list">
			<N8nCard
				v-for="request in pendingRequests"
				:key="request.id"
				:class="$style.card"
			>
				<div :class="$style.cardContent">
					<div :class="$style.cardHeader">
						<div :class="$style.titleRow">
							<N8nText tag="span" size="large" :bold="true">
								{{ request.nodeType }}
							</N8nText>
							<N8nBadge type="warning">
								{{ i18n.baseText('nodeGovernance.requests.status.pending') }}
							</N8nBadge>
						</div>
						<div :class="$style.actions">
							<N8nButton
								type="success"
								size="small"
								@click="onQuickApprove(request)"
							>
								{{ i18n.baseText('nodeGovernance.requests.approve') }}
							</N8nButton>
							<N8nButton
								type="danger"
								size="small"
								@click="onQuickReject(request)"
							>
								{{ i18n.baseText('nodeGovernance.requests.reject') }}
							</N8nButton>
							<N8nButton
								type="tertiary"
								size="small"
								@click="onReviewRequest(request)"
							>
								{{ i18n.baseText('nodeGovernance.requests.review') }}
							</N8nButton>
						</div>
					</div>

					<div :class="$style.cardBody">
						<N8nText tag="p" size="small" color="text-light">
							<strong>{{ i18n.baseText('nodeGovernance.requests.requester') }}:</strong>
							{{ getRequesterName(request) }}
						</N8nText>
						<N8nText tag="p" size="small" color="text-light">
							<strong>{{ i18n.baseText('nodeGovernance.requests.project') }}:</strong>
							{{ request.project?.name ?? request.projectId }}
						</N8nText>
						<N8nText v-if="request.workflowName" tag="p" size="small" color="text-light">
							<strong>{{ i18n.baseText('nodeGovernance.requests.workflow') }}:</strong>
							{{ request.workflowName }}
						</N8nText>
						<N8nText tag="p" size="small" color="text-light">
							<strong>{{ i18n.baseText('nodeGovernance.requests.justification') }}:</strong>
							{{ request.justification }}
						</N8nText>
						<N8nText tag="p" size="small" color="text-light">
							<strong>{{ i18n.baseText('nodeGovernance.requests.requestedAt') }}:</strong>
							{{ formatDate(request.createdAt) }}
						</N8nText>
					</div>
				</div>
			</N8nCard>
		</div>

		<ReviewRequestModal
			:show="showModal"
			:request="reviewingRequest"
			@close="onModalClose"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.card {
	padding: var(--spacing-s);
}

.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing-s);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.actions {
	display: flex;
	gap: var(--spacing-2xs);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
}
</style>
