<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { MessengerPlatform } from '@n8n/api-types';
import { N8nButton, N8nInputLabel, N8nText } from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import { MESSENGER_MANAGE_ACCOUNT_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useMessengerAccountsStore } from '@/features/core/auth/stores/messengerAccounts.store';

const props = defineProps<{
	data: { platform?: MessengerPlatform };
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const messengerStore = useMessengerAccountsStore();
const toast = useToast();

const isDisconnecting = ref(false);

const platform = computed(() => props.data?.platform);
const account = computed(() =>
	platform.value ? messengerStore.getAccount(platform.value) : undefined,
);

const platformLabel = computed(() => {
	if (!platform.value) return '';
	return i18n.baseText(`settings.personal.messenger.platform.${platform.value}`);
});

const formattedLinkedAt = computed(() => {
	if (!account.value) return '';
	const date = new Date(account.value.linkedAt);
	if (Number.isNaN(date.getTime())) return account.value.linkedAt;
	return date.toLocaleString();
});

function close() {
	uiStore.closeModal(MESSENGER_MANAGE_ACCOUNT_MODAL_KEY);
}

async function onDisconnect() {
	if (!platform.value || isDisconnecting.value) return;
	isDisconnecting.value = true;
	try {
		await messengerStore.unlink(platform.value);
		close();
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.personal.messenger.manage.modal.disconnectError'),
		);
	} finally {
		isDisconnecting.value = false;
	}
}
</script>

<template>
	<Modal
		:name="MESSENGER_MANAGE_ACCOUNT_MODAL_KEY"
		:title="i18n.baseText('settings.personal.messenger.manage.modal.title')"
		width="460px"
		:center="true"
	>
		<template #content>
			<div v-if="account" :class="$style.container" data-test-id="messenger-manage-content">
				<N8nInputLabel
					:label="i18n.baseText('settings.personal.messenger.manage.modal.platformLabel')"
				>
					<N8nText :bold="true">{{ platformLabel }}</N8nText>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('settings.personal.messenger.manage.modal.userIdLabel')"
				>
					<N8nText :class="$style.userId" data-test-id="messenger-platform-user-id">
						{{ account.platformUserId }}
					</N8nText>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('settings.personal.messenger.manage.modal.linkedAtLabel')"
				>
					<N8nText>{{ formattedLinkedAt }}</N8nText>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="danger"
					:label="i18n.baseText('settings.personal.messenger.manage.modal.disconnect')"
					:loading="isDisconnecting"
					:disabled="!account || isDisconnecting"
					data-test-id="messenger-disconnect-button"
					@click="onDisconnect"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.userId {
	font-family: var(--font-family--mono);
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
