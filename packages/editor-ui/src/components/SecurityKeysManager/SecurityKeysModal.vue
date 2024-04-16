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
import { ref, computed } from 'vue';
import { startRegistration } from '@simplewebauthn/browser';
import { useUsersStore } from '@/stores/users.store';

const userStore = useUsersStore();

const modalKey = ref(SECURITY_KEYS_MODAL_KEY);
const modalBus = createEventBus();

// const keys: SecurityKey[] = ref([]);
const keys: SecurityKey[] = ref([
	{ id: '1', label: 'Test Key' },
	{ id: '2', label: 'Test Key 2' },
]);

const deleteId = ref('');
const updateId = ref('');
const newName = ref('');

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

const updateKey = (id: string) => {
	const key = keys.value.find((key) => key.id === id);
	if (!key) return;
	key.label = newName.value.trim();
};

const deleteKey = (id: string) => {
	const index = keys.value.findIndex((key) => key.id === id);
	if (index === -1) return;
	keys.value.splice(index, 1);
};

const registerNewKey = async () => {
	const registrationOptions = await userStore.getChallenge();
	const registration = await startRegistration(registrationOptions);
	await this.usersStore.registerDevice(registration);
};
</script>

<style module lang="scss">
.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-2xs);
}
</style>
