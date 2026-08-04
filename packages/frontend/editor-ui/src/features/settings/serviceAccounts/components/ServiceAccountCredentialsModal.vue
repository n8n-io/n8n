<script lang="ts" setup>
import type {
	ServiceAccount,
	ServiceAccountCredential,
	ServiceAccountCredentialWithSecret,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nCollapsiblePanel,
	N8nCopyInput,
	N8nDialog,
	N8nDialogFooter,
	N8nInputLabel,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { DateTime } from 'luxon';
import { computed, ref, watch } from 'vue';

import { getServiceAccountDisplayName } from '../serviceAccounts.utils';
import { useServiceAccountsStore } from '../serviceAccounts.store';

import ServiceAccountCredentialUsage from './ServiceAccountCredentialUsage.vue';

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

const credentials = ref<ServiceAccountCredential[]>([]);
const created = ref<ServiceAccountCredentialWithSecret | null>(null);
const loading = ref(false);
const creating = ref(false);
const deleting = ref(false);
const deleteTarget = ref<ServiceAccountCredential | null>(null);
const usageOpen = ref(false);

const name = computed(() =>
	props.serviceAccount ? getServiceAccountDisplayName(props.serviceAccount) : '',
);

// The backend does not order the list, and `createdAt` is the only thing that
// distinguishes rows, so newest-first is imposed here.
const sorted = computed(() =>
	[...credentials.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
);

/** The usage panel documents the credential in hand: the fresh one, else the newest. */
const usageCredential = computed<ServiceAccountCredential | null>(
	() => created.value ?? sorted.value[0] ?? null,
);

const deleteDescription = computed(() =>
	deleteTarget.value
		? i18n.baseText('settings.serviceAccounts.credentials.delete.description', {
				interpolate: { clientId: deleteTarget.value.clientId },
			})
		: '',
);

const formatCreated = (createdAt: string) => DateTime.fromISO(createdAt).toRelative() ?? createdAt;

const fetchCredentials = async () => {
	if (!props.serviceAccount) return;
	loading.value = true;
	try {
		credentials.value = await serviceAccountsStore.listCredentials(props.serviceAccount.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.credentials.listError'));
	} finally {
		loading.value = false;
	}
};

// Reopening always starts from the list: the secret is shown once, so a stale
// `created` must never survive a close/reopen.
watch(
	() => props.open,
	async (open) => {
		created.value = null;
		deleteTarget.value = null;
		usageOpen.value = false;
		creating.value = false;
		if (open) {
			await fetchCredentials();
		} else {
			credentials.value = [];
		}
	},
);

const onCreate = async () => {
	if (!props.serviceAccount) return;
	creating.value = true;
	try {
		created.value = await serviceAccountsStore.createCredential(props.serviceAccount.id);
		// The one moment a copy-paste-ready command is possible, so lead with it open.
		usageOpen.value = true;
		toast.showMessage({
			title: i18n.baseText('settings.serviceAccounts.credentials.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.credentials.error'));
	} finally {
		creating.value = false;
	}
};

// Refresh before dropping `created`: the fresh credential is already in the list by
// the time the reveal state goes away, so the usage panel is never briefly credential-less.
const onDone = async () => {
	await fetchCredentials();
	created.value = null;
	usageOpen.value = false;
};

const onConfirmDelete = async () => {
	if (!deleteTarget.value) return;
	deleting.value = true;
	try {
		await serviceAccountsStore.deleteCredential(deleteTarget.value.id);
		toast.showMessage({
			title: i18n.baseText('settings.serviceAccounts.credentials.delete.success'),
			type: 'success',
		});
		deleteTarget.value = null;
		await fetchCredentials();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.credentials.delete.error'));
	} finally {
		deleting.value = false;
	}
};

const onCopied = () => {
	toast.showMessage({
		title: i18n.baseText('settings.serviceAccounts.credentials.copied'),
		type: 'success',
	});
};
</script>

<template>
	<N8nDialog
		:open="open"
		size="large"
		:header="i18n.baseText('settings.serviceAccounts.credentials.title', { interpolate: { name } })"
		@update:open="emit('update:open', $event)"
	>
		<!-- reka-ui's DialogRoot sets `inheritAttrs: false`, so the test id has to sit
			 on an element that actually renders. -->
		<div :class="$style.body" data-test-id="service-account-credentials-modal">
			<template v-if="created">
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
			</template>

			<template v-else>
				<N8nLoading v-if="loading" variant="p" :rows="3" />
				<N8nText
					v-else-if="sorted.length === 0"
					size="small"
					color="text-base"
					data-test-id="service-account-credentials-empty"
				>
					{{ i18n.baseText('settings.serviceAccounts.credentials.empty') }}
				</N8nText>
				<div v-else :class="$style.list" data-test-id="service-account-credentials-list">
					<div :class="[$style.row, $style.headerRow]">
						<N8nText size="small" color="text-light" bold>
							{{ i18n.baseText('settings.serviceAccounts.credentials.clientId') }}
						</N8nText>
						<N8nText size="small" color="text-light" bold>
							{{ i18n.baseText('settings.serviceAccounts.credentials.column.created') }}
						</N8nText>
						<span />
					</div>
					<div
						v-for="credential in sorted"
						:key="credential.id"
						:class="$style.row"
						data-test-id="service-account-credential-row"
					>
						<N8nCopyInput
							:value="credential.clientId"
							size="small"
							:class="$style.clientId"
							:copy-label="i18n.baseText('generic.copy')"
							:copied-label="i18n.baseText('generic.copiedToClipboard')"
							@copy="onCopied"
						/>
						<N8nText size="small" color="text-base">{{
							formatCreated(credential.createdAt)
						}}</N8nText>
						<N8nButton
							variant="ghost"
							icon-only
							icon="trash-2"
							size="small"
							:aria-label="
								i18n.baseText('settings.serviceAccounts.credentials.delete.action', {
									interpolate: { clientId: credential.clientId },
								})
							"
							data-test-id="service-account-credential-delete"
							@click="deleteTarget = credential"
						/>
					</div>
				</div>
			</template>

			<N8nCollapsiblePanel
				v-if="usageCredential"
				v-model="usageOpen"
				:title="i18n.baseText('settings.serviceAccounts.credentials.usage.title')"
			>
				<ServiceAccountCredentialUsage
					:client-id="usageCredential.clientId"
					:client-secret="created?.clientSecret"
				/>
			</N8nCollapsiblePanel>
		</div>

		<N8nDialogFooter>
			<N8nButton
				v-if="created"
				:label="i18n.baseText('settings.serviceAccounts.credentials.done')"
				data-test-id="service-account-credential-done"
				@click="onDone"
			/>
			<N8nButton
				v-else
				:loading="creating"
				:label="i18n.baseText('settings.serviceAccounts.credentials.add')"
				data-test-id="service-account-credential-add"
				@click="onCreate"
			/>
		</N8nDialogFooter>

		<!--
			Nested in the component tree only: its own portal puts it on the body after
			this dialog's, so it stacks on top at the shared dialog z-index, and reka-ui's
			layer stack keeps this dialog from dismissing underneath it.
		-->
		<N8nAlertDialog
			:open="deleteTarget !== null"
			:title="i18n.baseText('settings.serviceAccounts.credentials.delete.title')"
			:description="deleteDescription"
			:action-label="i18n.baseText('settings.serviceAccounts.credentials.delete.confirm')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="deleting"
			size="medium"
			@action="onConfirmDelete"
			@cancel="deleteTarget = null"
			@update:open="!$event && (deleteTarget = null)"
		>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.serviceAccounts.credentials.tokensRemainValid') }}
			</N8nText>
		</N8nAlertDialog>
	</N8nDialog>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	/* The usage panel makes the reveal state tall; keep the dialog inside the viewport. */
	max-height: 60vh;
	overflow-y: auto;
}

/* One grid for the whole list, rows as `display: contents`, so the column headers
   line up with the cells below them — per-row grids would each size independently. */
.list {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto auto;
	align-items: center;
	column-gap: var(--spacing--xs);
	row-gap: var(--spacing--2xs);
}

.row {
	display: contents;
}

/* No row dividers: `display: contents` rows can't carry a border, and per-cell
   borders come out broken by the column gaps. The bordered client-ID field
   already separates the rows. */

.clientId input {
	font-family: var(--font-family--monospace);
}
</style>
