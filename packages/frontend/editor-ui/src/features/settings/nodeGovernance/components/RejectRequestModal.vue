<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import { REJECT_REQUEST_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const loading = ref(false);
const comment = ref('');

const modalData = computed(() => uiStore.modalsById[REJECT_REQUEST_MODAL_KEY]?.data ?? {});
const request = computed(() => modalData.value.request);
const modalTitle = computed(() => i18n.baseText('nodeGovernance.requests.reject.title'));

watch(
	() => uiStore.modalsById[REJECT_REQUEST_MODAL_KEY]?.open,
	(isOpen) => {
		if (isOpen) {
			comment.value = '';
		}
	},
);

async function onReject() {
	if (!request.value) return;

	loading.value = true;
	try {
		await nodeGovernanceStore.reviewRequest(request.value.id, {
			action: 'reject',
			comment: comment.value || undefined,
		});
		showMessage({
			title: i18n.baseText('nodeGovernance.requests.reject.success'),
			type: 'success',
		});
		closeModal();
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.requests.reject.error'));
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(REJECT_REQUEST_MODAL_KEY);
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
</script>

<template>
	<Modal
		:name="REJECT_REQUEST_MODAL_KEY"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		width="550px"
	>
		<template #content>
			<div v-if="request" :class="$style.content">
				<!-- Request Details Section -->
				<div :class="$style.section">
					<N8nText tag="h4" :bold="true" size="small" color="text-dark">
						{{ i18n.baseText('nodeGovernance.requests.review.requestDetails') }}
					</N8nText>
					<div :class="$style.detailsCard">
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel"
								>{{ i18n.baseText('nodeGovernance.requests.nodeType') }}:</span
							>
							<span :class="$style.detailValue">{{ request.nodeType }}</span>
						</div>
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel"
								>{{ i18n.baseText('nodeGovernance.requests.requester') }}:</span
							>
							<span :class="$style.detailValue">
								{{ request.requestedBy?.firstName }} {{ request.requestedBy?.lastName }} ({{
									request.requestedBy?.email
								}})
							</span>
						</div>
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel"
								>{{ i18n.baseText('nodeGovernance.requests.project') }}:</span
							>
							<span :class="$style.detailValue">{{
								request.project?.name || request.projectId
							}}</span>
						</div>
						<div v-if="request.workflowName" :class="$style.detailRow">
							<span :class="$style.detailLabel"
								>{{ i18n.baseText('nodeGovernance.requests.workflow') }}:</span
							>
							<span :class="$style.detailValue">{{ request.workflowName }}</span>
						</div>
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel"
								>{{ i18n.baseText('nodeGovernance.requests.requestedAt') }}:</span
							>
							<span :class="$style.detailValue">{{ formatDate(request.createdAt) }}</span>
						</div>
						<div :class="$style.justificationRow">
							<span :class="$style.detailLabel"
								>{{ i18n.baseText('nodeGovernance.requests.justification') }}:</span
							>
							<p :class="$style.justificationText">{{ request.justification }}</p>
						</div>
					</div>
				</div>

				<!-- Optional Response Section -->
				<div :class="$style.section">
					<N8nText tag="h4" :bold="true" size="small" color="text-dark">
						{{ i18n.baseText('nodeGovernance.requests.reject.response') }}
						<span :class="$style.optionalLabel">
							{{ i18n.baseText('nodeGovernance.requests.reject.optional') }}
						</span>
					</N8nText>
					<N8nInput
						v-model="comment"
						type="textarea"
						:rows="3"
						:placeholder="i18n.baseText('nodeGovernance.requests.reject.commentPlaceholder')"
					/>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="danger" :loading="loading" @click="onReject">
					{{ i18n.baseText('nodeGovernance.requests.reject') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.section {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.detailsCard {
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: 8px;
	padding: 16px;
}

.detailRow {
	display: flex;
	gap: 10px;
	margin-bottom: 6px;
	font-size: 13px;
}

.detailLabel {
	color: var(--color--text--tint-1);
	min-width: 100px;
}

.detailValue {
	color: var(--color--text);
	font-weight: 500;
}

.justificationRow {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-top: 10px;
	padding-top: 10px;
	border-top: 1px solid var(--color--foreground);
}

.justificationText {
	color: var(--color--text);
	font-size: 13px;
	line-height: 1.5;
	margin: 0;
}

.optionalLabel {
	color: var(--color--text--tint-1);
	font-weight: normal;
	font-size: 12px;
	margin-left: 4px;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
</style>
