<template>
	<Modal
		id="security-keys-modal"
		:title="$locale.baseText('securityKeysModal.title')"
		:name="modalKey"
		:event-bus="modalBus"
		min-width="620px"
		min-height="420px"
	>
		<template #content>
			<NoKeysView v-if="keys.length === 0" @add-new-key="registerNewKey" />
			<SecurityKeyTable
				v-else
				:keys="rows"
				:new-name="newName"
				@new-name-change="onNewNameChange"
				@update-enable="onUpdateEnable"
				@delete-enable="onDeleteEnable"
				@disable-update="onDisableUpdate"
				@cancel-operation="onCancelOperation"
				@apply-operation="onApplyOperation"
			/>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					type="success"
					:label="$locale.baseText('securityKeysModal.addKey')"
					icon="plus-circle"
					@click="registerNewKey"
				/>
				<n8n-button :label="$locale.baseText('securityKeysModal.done')" @click="close" />
			</div>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import SecurityKeyTable from '@/components/SecurityKeysManager/SecurityKeysTable.vue';
import NoKeysView from '@/components/SecurityKeysManager/NoKeysView.vue';
import { SECURITY_KEYS_MODAL_KEY } from '@/constants';
import { createEventBus } from 'n8n-design-system/utils';
import type { Ref } from 'vue';
import { ref, computed, onMounted } from 'vue';
import { startRegistration } from '@simplewebauthn/browser';
import { useUsersStore } from '@/stores/users.store';
import type { SecurityKey } from '@/Interface';
import { useToast } from '@/composables/useToast';

const userStore = useUsersStore();

const modalKey = ref(SECURITY_KEYS_MODAL_KEY);
const modalBus = createEventBus();

const keys: Ref<SecurityKey[]> = ref([]);

const deleteId = ref('');
const updateId = ref('');
const newName = ref('');

onMounted(async () => {
	keys.value = await userStore.getSecurityKeys();
});

const rows = computed(() => {
	return keys.value.map((key) => {
		return {
			id: key.id,
			label: key.label,
			update: updateId.value === key.id,
			delete: deleteId.value === key.id,
		};
	});
});

const close = () => {
	modalBus.emit('close', modalKey.value);
};

const onDeleteEnable = (row: SecurityKey) => {
	deleteId.value = row.id;
};

const onNewNameChange = (val: string) => {
	newName.value = val;
};

const onCancelOperation = () => {
	if (deleteId.value) {
		deleteId.value = '';
	} else if (updateId.value) {
		disableUpdate();
	}
};

const onApplyOperation = () => {
	if (deleteId.value) {
		deleteKey(deleteId.value);
		deleteId.value = '';
	} else if (updateId.value) {
		updateKey(updateId.value);
		disableUpdate();
	}
};

const disableUpdate = () => {
	updateId.value = '';
	newName.value = '';
};

const onUpdateEnable = (row: SecurityKey) => {
	updateId.value = row.id;
	newName.value = row.label;
};

const updateKey = async (id: string) => {
	const key = keys.value.find((key) => key.id === id);
	if (!key) return;
	await userStore.updateSecurityKeyLabel(id, newName.value.trim());
	keys.value = await userStore.getSecurityKeys();
};

const deleteKey = async (id: string) => {
	await userStore.deleteSecurityKey(id);
	keys.value = await userStore.getSecurityKeys();
};

const registerNewKey = async () => {
	const registrationOptions = await userStore.getChallenge();
	try {
		const registration = await startRegistration(registrationOptions);
		await userStore.registerDevice(registration);
		keys.value = await userStore.getSecurityKeys();
	} catch (e) {
		if (e.name === 'InvalidStateError') {
			useToast().showMessage({
				message: 'Security key already registered',
				type: 'error',
			});
		}
	}
};
</script>

<style module lang="scss">
.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-2xs);
}
</style>
