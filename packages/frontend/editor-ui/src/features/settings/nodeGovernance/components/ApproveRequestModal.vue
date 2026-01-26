<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { storeToRefs } from 'pinia';

import { N8nButton, N8nText, N8nSelect, N8nOption } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import { APPROVE_REQUEST_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const { allowPolicies } = storeToRefs(nodeGovernanceStore);

const loading = ref(false);
const selectedPolicyId = ref<string | null>(null);
const createNewPolicy = ref(true);

const modalData = computed(() => uiStore.modalsById[APPROVE_REQUEST_MODAL_KEY]?.data ?? {});
const request = computed(() => modalData.value.request);
const modalTitle = computed(() => i18n.baseText('nodeGovernance.requests.approve.title'));

// Filter policies to only show category-type policies
const categoryPolicies = computed(() =>
	allowPolicies.value.filter((policy) => policy.targetType === 'category'),
);

// Fetch policies if not already loaded
watch(
	() => uiStore.modalsById[APPROVE_REQUEST_MODAL_KEY]?.open,
	async (isOpen) => {
		if (isOpen) {
			selectedPolicyId.value = null;
			createNewPolicy.value = true;
			// Ensure policies are loaded
			if (allowPolicies.value.length === 0) {
				await nodeGovernanceStore.fetchPolicies();
			}
		}
	},
);

// Format policy display name
function getPolicyDisplayName(policy: (typeof allowPolicies.value)[0]): string {
	const scope = policy.scope === 'global' ? 'Global' : 'Projects';
	return `${scope} - Category: ${policy.targetValue}`;
}

async function onApprove() {
	if (!request.value) return;

	loading.value = true;
	try {
		const payload: { action: 'approve'; policyId?: string } = {
			action: 'approve',
		};

		if (!createNewPolicy.value && selectedPolicyId.value) {
			payload.policyId = selectedPolicyId.value;
		}

		await nodeGovernanceStore.reviewRequest(request.value.id, payload);
		// Refresh policies and categories to reflect the changes
		await Promise.all([nodeGovernanceStore.fetchPolicies(), nodeGovernanceStore.fetchCategories()]);
		showMessage({
			title: i18n.baseText('nodeGovernance.requests.approve.success'),
			type: 'success',
		});
		closeModal();
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.requests.approve.error'));
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(APPROVE_REQUEST_MODAL_KEY);
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

function onPolicySelectionChange(value: string | null) {
	if (value === '__create_new__') {
		createNewPolicy.value = true;
		selectedPolicyId.value = null;
	} else {
		createNewPolicy.value = false;
		selectedPolicyId.value = value;
	}
}
</script>

<template>
	<Modal
		:name="APPROVE_REQUEST_MODAL_KEY"
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

				<!-- Policy Selection Section -->
				<div :class="$style.section">
					<N8nText tag="h4" :bold="true" size="small" color="text-dark">
						{{ i18n.baseText('nodeGovernance.requests.approve.selectPolicy') }}
					</N8nText>
					<N8nSelect
						:model-value="createNewPolicy ? '__create_new__' : selectedPolicyId"
						:class="$style.select"
						@update:model-value="onPolicySelectionChange"
					>
						<N8nOption
							value="__create_new__"
							:label="i18n.baseText('nodeGovernance.requests.approve.createNewPolicy')"
						/>
						<N8nOption
							v-for="policy in categoryPolicies"
							:key="policy.id"
							:value="policy.id"
							:label="getPolicyDisplayName(policy)"
						/>
					</N8nSelect>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('nodeGovernance.requests.approve.policyHint') }}
					</N8nText>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="success" :loading="loading" @click="onApprove">
					{{ i18n.baseText('nodeGovernance.requests.approve') }}
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

.select {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
</style>
