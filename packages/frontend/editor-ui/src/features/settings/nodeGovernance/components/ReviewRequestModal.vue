<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

import {
	N8nButton,
	N8nInput,
	N8nCheckbox,
	N8nText,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeAccessRequest } from '../nodeGovernance.api';

const props = defineProps<{
	show: boolean;
	request: NodeAccessRequest | null;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { showError, showMessage } = useToast();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const loading = ref(false);
const comment = ref('');
const createPolicy = ref(true);

const modalTitle = computed(() => i18n.baseText('nodeGovernance.requests.review.title'));

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function getRequesterName(): string {
	if (!props.request) return '';
	if (props.request.requestedBy) {
		const { firstName, lastName, email } = props.request.requestedBy;
		if (firstName || lastName) {
			return `${firstName ?? ''} ${lastName ?? ''}`.trim();
		}
		return email;
	}
	return props.request.requestedById;
}

async function onApprove() {
	if (!props.request) return;

	loading.value = true;
	try {
		await nodeGovernanceStore.reviewRequest(props.request.id, {
			action: 'approve',
			comment: comment.value || undefined,
			createPolicy: createPolicy.value,
		});
		showMessage({
			title: i18n.baseText('nodeGovernance.requests.approve.success'),
			type: 'success',
		});
		emit('close');
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.requests.approve.error'));
	} finally {
		loading.value = false;
	}
}

async function onReject() {
	if (!props.request) return;

	loading.value = true;
	try {
		await nodeGovernanceStore.reviewRequest(props.request.id, {
			action: 'reject',
			comment: comment.value || undefined,
		});
		showMessage({
			title: i18n.baseText('nodeGovernance.requests.reject.success'),
			type: 'success',
		});
		emit('close');
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.requests.reject.error'));
	} finally {
		loading.value = false;
	}
}

function onClose() {
	comment.value = '';
	createPolicy.value = true;
	emit('close');
}
</script>

<template>
	<Modal
		:name="'review-request-modal'"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		:model-value="show"
		width="550px"
		@update:model-value="onClose"
	>
		<template #content>
			<div v-if="request" :class="$style.content">
				<div :class="$style.section">
					<N8nText tag="h4" :bold="true">
						{{ i18n.baseText('nodeGovernance.requests.review.requestDetails') }}
					</N8nText>
					<div :class="$style.details">
						<div :class="$style.detailRow">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('nodeGovernance.requests.nodeType') }}:
							</N8nText>
							<N8nText size="small" :bold="true">
								{{ request.nodeType }}
							</N8nText>
						</div>
						<div :class="$style.detailRow">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('nodeGovernance.requests.project') }}:
							</N8nText>
							<N8nText size="small">
								{{ request.project?.name ?? request.projectId }}
							</N8nText>
						</div>
						<div :class="$style.detailRow">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('nodeGovernance.requests.requester') }}:
							</N8nText>
							<N8nText size="small">
								{{ getRequesterName() }}
							</N8nText>
						</div>
						<div v-if="request.workflowName" :class="$style.detailRow">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('nodeGovernance.requests.workflow') }}:
							</N8nText>
							<N8nText size="small">
								{{ request.workflowName }}
							</N8nText>
						</div>
						<div :class="$style.detailRow">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('nodeGovernance.requests.requestedAt') }}:
							</N8nText>
							<N8nText size="small">
								{{ formatDate(request.createdAt) }}
							</N8nText>
						</div>
					</div>
				</div>

				<div :class="$style.section">
					<N8nText tag="h4" :bold="true">
						{{ i18n.baseText('nodeGovernance.requests.justification') }}
					</N8nText>
					<div :class="$style.justification">
						<N8nText>{{ request.justification }}</N8nText>
					</div>
				</div>

				<div :class="$style.section">
					<N8nText tag="h4" :bold="true">
						{{ i18n.baseText('nodeGovernance.requests.review.yourResponse') }}
					</N8nText>
					<N8nInput
						v-model="comment"
						type="textarea"
						:rows="3"
						:placeholder="i18n.baseText('nodeGovernance.requests.review.commentPlaceholder')"
					/>
				</div>

				<div :class="$style.section">
					<N8nCheckbox v-model="createPolicy">
						{{ i18n.baseText('nodeGovernance.requests.review.createPolicy') }}
					</N8nCheckbox>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('nodeGovernance.requests.review.createPolicyHint') }}
					</N8nText>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="onClose">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="danger" :loading="loading" @click="onReject">
					{{ i18n.baseText('nodeGovernance.requests.reject') }}
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
	gap: var(--spacing-m);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	padding: var(--spacing-xs);
	background: var(--color-background-light);
	border-radius: var(--border-radius-base);
}

.detailRow {
	display: flex;
	gap: var(--spacing-xs);
}

.justification {
	padding: var(--spacing-xs);
	background: var(--color-background-light);
	border-radius: var(--border-radius-base);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-xs);
}
</style>
