<script lang="ts" setup>
import type { ServiceAccount, ServiceAccountCredentialWithSecret } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCopyInput,
	N8nDialog,
	N8nDialogFooter,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { getServiceAccountDisplayName } from '../serviceAccounts.utils';
import { useServiceAccountsStore } from '../serviceAccounts.store';

const props = defineProps<{
	serviceAccount: ServiceAccount | null;
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const serviceAccountsStore = useServiceAccountsStore();

const created = ref<ServiceAccountCredentialWithSecret | null>(null);
const loading = ref(false);

const name = computed(() =>
	props.serviceAccount ? getServiceAccountDisplayName(props.serviceAccount) : '',
);

// Reopening always starts from the form: the secret is shown once, so a stale
// `created` must never survive a close/reopen.
watch(
	() => props.open,
	(open) => {
		if (!open) {
			created.value = null;
			loading.value = false;
		}
	},
);

const onCreate = async () => {
	if (!props.serviceAccount) return;
	loading.value = true;
	try {
		created.value = await serviceAccountsStore.createCredential(props.serviceAccount.id);
		toast.showMessage({
			title: i18n.baseText('settings.serviceAccounts.credentials.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.credentials.error'));
	} finally {
		loading.value = false;
	}
};

const onCopied = () => {
	toast.showMessage({
		title: i18n.baseText('settings.serviceAccounts.credentials.copied'),
		type: 'success',
	});
};

const close = () => emit('update:open', false);
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('settings.serviceAccounts.credentials.title', { interpolate: { name } })"
		data-test-id="create-service-account-credential-modal"
		@update:open="emit('update:open', $event)"
	>
		<div v-if="!created" :class="$style.form">
			<N8nText size="medium" color="text-base">
				{{
					i18n.baseText('settings.serviceAccounts.credentials.description', {
						interpolate: { name },
					})
				}}
			</N8nText>
			<N8nDialogFooter>
				<N8nButton
					:loading="loading"
					:label="i18n.baseText('settings.serviceAccounts.credentials.create')"
					data-test-id="create-service-account-credential-confirm"
					@click="onCreate"
				/>
			</N8nDialogFooter>
		</div>

		<div v-else :class="$style.created">
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('settings.serviceAccounts.credentials.warning') }}
			</N8nText>
			<N8nInputLabel
				:label="i18n.baseText('settings.serviceAccounts.credentials.clientId')"
				color="text-dark"
			>
				<N8nCopyInput
					:value="created.clientId"
					size="large"
					:copy-label="i18n.baseText('generic.copy')"
					:copied-label="i18n.baseText('generic.copiedToClipboard')"
					data-test-id="service-account-credential-client-id"
					@copy="onCopied"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('settings.serviceAccounts.credentials.clientSecret')"
				color="text-dark"
			>
				<N8nCopyInput
					:value="created.clientSecret"
					size="large"
					:copy-label="i18n.baseText('generic.copy')"
					:copied-label="i18n.baseText('generic.copiedToClipboard')"
					class="ph-no-capture"
					data-test-id="service-account-credential-client-secret"
					@copy="onCopied"
				/>
			</N8nInputLabel>
			<N8nDialogFooter>
				<N8nButton
					:label="i18n.baseText('settings.serviceAccounts.credentials.done')"
					data-test-id="create-service-account-credential-done"
					@click="close"
				/>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style module lang="scss">
.form,
.created {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
