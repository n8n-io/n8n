<script lang="ts" setup>
import { ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import {
	N8nButton,
	N8nCard,
	N8nBadge,
	N8nText,
	N8nIconButton,
	N8nActionBox,
} from '@n8n/design-system';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeGovernancePolicy } from '../nodeGovernance.api';
import PolicyFormModal from './PolicyFormModal.vue';

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const { policies } = storeToRefs(nodeGovernanceStore);

const showModal = ref(false);
const editingPolicy = ref<NodeGovernancePolicy | null>(null);

function onCreatePolicy() {
	editingPolicy.value = null;
	showModal.value = true;
}

function onEditPolicy(policy: NodeGovernancePolicy) {
	editingPolicy.value = policy;
	showModal.value = true;
}

async function onDeletePolicy(policy: NodeGovernancePolicy) {
	const confirmed = await confirm(
		i18n.baseText('nodeGovernance.policies.delete.description'),
		i18n.baseText('nodeGovernance.policies.delete.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmed === 'confirm') {
		try {
			await nodeGovernanceStore.deletePolicy(policy.id);
			showMessage({
				title: i18n.baseText('nodeGovernance.policies.delete.success'),
				type: 'success',
			});
		} catch (e) {
			showError(e, i18n.baseText('nodeGovernance.policies.delete.error'));
		}
	}
}

function onModalClose() {
	showModal.value = false;
	editingPolicy.value = null;
}

function getPolicyBadgeType(policy: NodeGovernancePolicy): 'success' | 'danger' {
	return policy.policyType === 'allow' ? 'success' : 'danger';
}

function getScopeBadgeType(policy: NodeGovernancePolicy): 'primary' | 'secondary' {
	return policy.scope === 'global' ? 'primary' : 'secondary';
}

function getProjectNames(policy: NodeGovernancePolicy): string {
	if (!policy.projectAssignments || policy.projectAssignments.length === 0) {
		return '';
	}
	return policy.projectAssignments
		.map((a) => a.project?.name ?? a.projectId)
		.join(', ');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nButton size="medium" @click="onCreatePolicy">
				{{ i18n.baseText('nodeGovernance.policies.create') }}
			</N8nButton>
		</div>

		<N8nActionBox
			v-if="policies.length === 0"
			:heading="i18n.baseText('nodeGovernance.policies.empty.title')"
			:description="i18n.baseText('nodeGovernance.policies.empty.description')"
			:button-text="i18n.baseText('nodeGovernance.policies.create')"
			@click:button="onCreatePolicy"
		/>

		<div v-else :class="$style.list">
			<N8nCard
				v-for="policy in policies"
				:key="policy.id"
				:class="$style.card"
			>
				<div :class="$style.cardContent">
					<div :class="$style.cardHeader">
						<div :class="$style.badges">
							<N8nBadge :type="getPolicyBadgeType(policy)">
								{{ policy.policyType.toUpperCase() }}
							</N8nBadge>
							<N8nBadge :type="getScopeBadgeType(policy)">
								{{ policy.scope.toUpperCase() }}
							</N8nBadge>
							<N8nBadge theme="tertiary">
								{{ policy.targetType.toUpperCase() }}
							</N8nBadge>
						</div>
						<div :class="$style.actions">
							<N8nIconButton
								icon="pen"
								type="tertiary"
								size="small"
								:title="i18n.baseText('generic.edit')"
								@click="onEditPolicy(policy)"
							/>
							<N8nIconButton
								icon="trash"
								type="tertiary"
								size="small"
								:title="i18n.baseText('generic.delete')"
								@click="onDeletePolicy(policy)"
							/>
						</div>
					</div>

					<div :class="$style.cardBody">
						<N8nText tag="p" size="large" :bold="true">
							{{ policy.targetValue }}
						</N8nText>
						<N8nText
							v-if="policy.scope === 'projects' && getProjectNames(policy)"
							tag="p"
							size="small"
							color="text-light"
						>
							{{ i18n.baseText('nodeGovernance.policies.projects') }}: {{ getProjectNames(policy) }}
						</N8nText>
					</div>
				</div>
			</N8nCard>
		</div>

		<PolicyFormModal
			:show="showModal"
			:policy="editingPolicy"
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

.header {
	display: flex;
	justify-content: flex-end;
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
	gap: var(--spacing-xs);
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.badges {
	display: flex;
	gap: var(--spacing-2xs);
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
