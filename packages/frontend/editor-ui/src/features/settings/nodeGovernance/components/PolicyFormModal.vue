<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

import {
	N8nButton,
	N8nInput,
	N8nSelect,
	N8nOption,
	N8nFormInputs,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeGovernancePolicy } from '../nodeGovernance.api';

const props = defineProps<{
	show: boolean;
	policy: NodeGovernancePolicy | null;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { showError, showMessage } = useToast();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const loading = ref(false);

const policyType = ref<'allow' | 'block'>('block');
const scope = ref<'global' | 'projects'>('global');
const targetType = ref<'node' | 'category'>('node');
const targetValue = ref('');
const projectIds = ref<string[]>([]);

const isEdit = computed(() => props.policy !== null);
const modalTitle = computed(() =>
	isEdit.value
		? i18n.baseText('nodeGovernance.policies.edit.title')
		: i18n.baseText('nodeGovernance.policies.create.title'),
);

watch(
	() => props.show,
	(newValue) => {
		if (newValue && props.policy) {
			policyType.value = props.policy.policyType;
			scope.value = props.policy.scope;
			targetType.value = props.policy.targetType;
			targetValue.value = props.policy.targetValue;
			projectIds.value =
				props.policy.projectAssignments?.map((a) => a.projectId) ?? [];
		} else if (newValue) {
			resetForm();
		}
	},
);

function resetForm() {
	policyType.value = 'block';
	scope.value = 'global';
	targetType.value = 'node';
	targetValue.value = '';
	projectIds.value = [];
}

async function onSubmit() {
	if (!targetValue.value.trim()) {
		showError(
			new Error(i18n.baseText('nodeGovernance.policies.validation.targetValue')),
			i18n.baseText('nodeGovernance.policies.validation.error'),
		);
		return;
	}

	loading.value = true;

	try {
		if (isEdit.value && props.policy) {
			await nodeGovernanceStore.updatePolicy(props.policy.id, {
				policyType: policyType.value,
				scope: scope.value,
				targetType: targetType.value,
				targetValue: targetValue.value,
				projectIds: scope.value === 'projects' ? projectIds.value : [],
			});
			showMessage({
				title: i18n.baseText('nodeGovernance.policies.update.success'),
				type: 'success',
			});
		} else {
			await nodeGovernanceStore.createPolicy({
				policyType: policyType.value,
				scope: scope.value,
				targetType: targetType.value,
				targetValue: targetValue.value,
				projectIds: scope.value === 'projects' ? projectIds.value : undefined,
			});
			showMessage({
				title: i18n.baseText('nodeGovernance.policies.create.success'),
				type: 'success',
			});
		}
		emit('close');
	} catch (e) {
		showError(
			e,
			isEdit.value
				? i18n.baseText('nodeGovernance.policies.update.error')
				: i18n.baseText('nodeGovernance.policies.create.error'),
		);
	} finally {
		loading.value = false;
	}
}

function onClose() {
	emit('close');
}
</script>

<template>
	<Modal
		:name="'policy-form-modal'"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		:model-value="show"
		width="500px"
		@update:model-value="onClose"
	>
		<template #content>
			<div :class="$style.form">
				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.policies.form.policyType') }}
					</label>
					<N8nSelect v-model="policyType" :class="$style.input">
						<N8nOption value="block" :label="i18n.baseText('nodeGovernance.policies.type.block')" />
						<N8nOption value="allow" :label="i18n.baseText('nodeGovernance.policies.type.allow')" />
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.policies.form.scope') }}
					</label>
					<N8nSelect v-model="scope" :class="$style.input">
						<N8nOption value="global" :label="i18n.baseText('nodeGovernance.policies.scope.global')" />
						<N8nOption value="projects" :label="i18n.baseText('nodeGovernance.policies.scope.projects')" />
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.policies.form.targetType') }}
					</label>
					<N8nSelect v-model="targetType" :class="$style.input">
						<N8nOption value="node" :label="i18n.baseText('nodeGovernance.policies.target.node')" />
						<N8nOption value="category" :label="i18n.baseText('nodeGovernance.policies.target.category')" />
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.policies.form.targetValue') }}
					</label>
					<N8nInput
						v-model="targetValue"
						:class="$style.input"
						:placeholder="
							targetType === 'node'
								? 'e.g., n8n-nodes-base.httpRequest'
								: 'e.g., external-api'
						"
					/>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="onClose">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton :loading="loading" @click="onSubmit">
					{{ isEdit ? i18n.baseText('generic.save') : i18n.baseText('generic.create') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
}

.input {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-xs);
}
</style>
