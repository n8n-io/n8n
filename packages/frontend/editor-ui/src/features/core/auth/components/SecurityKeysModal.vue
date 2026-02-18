<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { SECURITY_KEYS_MODAL_KEY } from '@/app/constants';
import type { WebAuthnCredentialResponse } from '@n8n/api-types';

import { N8nButton, N8nHeading, N8nInput, N8nText, N8nIconButton } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';

const i18n = useI18n();
const { showToast, showError } = useToast();
const usersStore = useUsersStore();
const uiStore = useUIStore();

const credentials = ref<WebAuthnCredentialResponse[]>([]);
const loading = ref(false);
const registering = ref(false);
const newKeyLabel = ref('');
const showRegisterForm = ref(false);
const editingId = ref<string | null>(null);
const editingLabel = ref('');
const recoveryCodes = ref<string[]>([]);
const showRecoveryCodes = ref(false);

async function loadCredentials() {
	loading.value = true;
	try {
		credentials.value = await usersStore.fetchWebAuthnCredentials();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.securityKeys.error.load'));
	} finally {
		loading.value = false;
	}
}

async function registerKey() {
	if (!newKeyLabel.value.trim()) return;
	registering.value = true;
	try {
		const result = await usersStore.registerWebAuthnCredential(newKeyLabel.value.trim());
		if (result.recoveryCodes?.length) {
			recoveryCodes.value = result.recoveryCodes;
			showRecoveryCodes.value = true;
		}
		showToast({
			title: i18n.baseText('settings.personal.securityKeys.toast.registered.title'),
			message: i18n.baseText('settings.personal.securityKeys.toast.registered.message'),
			type: 'success',
		});
		newKeyLabel.value = '';
		showRegisterForm.value = false;
		await loadCredentials();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.securityKeys.error.register'));
	} finally {
		registering.value = false;
	}
}

async function deleteKey(id: string) {
	try {
		await usersStore.deleteWebAuthnCredential(id);
		showToast({
			title: i18n.baseText('settings.personal.securityKeys.toast.deleted.title'),
			message: i18n.baseText('settings.personal.securityKeys.toast.deleted.message'),
			type: 'success',
		});
		await loadCredentials();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.securityKeys.error.delete'));
	}
}

function startEdit(cred: WebAuthnCredentialResponse) {
	editingId.value = cred.id;
	editingLabel.value = cred.label;
}

async function saveEdit() {
	if (!editingId.value || !editingLabel.value.trim()) return;
	try {
		await usersStore.updateWebAuthnCredentialLabel(editingId.value, editingLabel.value.trim());
		editingId.value = null;
		editingLabel.value = '';
		await loadCredentials();
	} catch (e) {
		showError(e, i18n.baseText('settings.personal.securityKeys.error.rename'));
	}
}

function cancelEdit() {
	editingId.value = null;
	editingLabel.value = '';
}

function closeModal() {
	uiStore.closeModal(SECURITY_KEYS_MODAL_KEY);
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString();
}

function getDeviceTypeLabel(deviceType: string | null): string {
	if (deviceType === 'multiDevice')
		return i18n.baseText('settings.personal.securityKeys.type.multiDevice');
	if (deviceType === 'singleDevice')
		return i18n.baseText('settings.personal.securityKeys.type.singleDevice');
	return i18n.baseText('settings.personal.securityKeys.type.unknown');
}

onMounted(loadCredentials);
</script>

<template>
	<Modal
		:name="SECURITY_KEYS_MODAL_KEY"
		:title="i18n.baseText('settings.personal.securityKeys.modal.title')"
		min-width="520px"
		max-width="620px"
	>
		<template #content>
			<!-- Recovery codes notice -->
			<div v-if="showRecoveryCodes" :class="$style.recoveryCodes">
				<N8nHeading size="small" class="mb-xs">{{
					i18n.baseText('settings.personal.securityKeys.recoveryCodes.title')
				}}</N8nHeading>
				<N8nText size="small" :class="$style.recoveryCodesWarning">{{
					i18n.baseText('settings.personal.securityKeys.recoveryCodes.warning')
				}}</N8nText>
				<div :class="$style.recoveryCodesList">
					<code v-for="code in recoveryCodes" :key="code">{{ code }}</code>
				</div>
				<N8nButton
					:label="i18n.baseText('settings.personal.securityKeys.recoveryCodes.dismiss')"
					variant="outline"
					size="small"
					class="mt-s"
					@click="showRecoveryCodes = false"
				/>
			</div>

			<!-- Credentials list -->
			<div v-if="!loading && credentials.length > 0" :class="$style.credentialsList">
				<div
					v-for="cred in credentials"
					:key="cred.id"
					:class="$style.credentialRow"
					data-test-id="webauthn-credential-row"
				>
					<div v-if="editingId === cred.id" :class="$style.editRow">
						<N8nInput
							v-model="editingLabel"
							size="small"
							:placeholder="i18n.baseText('settings.personal.securityKeys.label.placeholder')"
							@keyup.enter="saveEdit"
							@keyup.escape="cancelEdit"
						/>
						<N8nIconButton
							icon="check"
							size="small"
							:title="i18n.baseText('generic.save')"
							@click="saveEdit"
						/>
						<N8nIconButton
							icon="x"
							size="small"
							variant="ghost"
							:title="i18n.baseText('generic.cancel')"
							@click="cancelEdit"
						/>
					</div>
					<template v-else>
						<div :class="$style.credentialInfo">
							<N8nText :bold="true" size="small">{{ cred.label }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ getDeviceTypeLabel(cred.deviceType) }} &middot;
								{{ formatDate(cred.createdAt) }}
							</N8nText>
						</div>
						<div :class="$style.credentialActions">
							<N8nIconButton
								icon="pencil"
								size="small"
								variant="ghost"
								:title="i18n.baseText('settings.personal.securityKeys.action.rename')"
								data-test-id="webauthn-rename-button"
								@click="startEdit(cred)"
							/>
							<N8nIconButton
								icon="trash-2"
								size="small"
								variant="ghost"
								:title="i18n.baseText('settings.personal.securityKeys.action.delete')"
								data-test-id="webauthn-delete-button"
								@click="deleteKey(cred.id)"
							/>
						</div>
					</template>
				</div>
			</div>

			<!-- Empty state -->
			<div v-if="!loading && credentials.length === 0" :class="$style.emptyState">
				<N8nText color="text-light">{{
					i18n.baseText('settings.personal.securityKeys.empty')
				}}</N8nText>
			</div>

			<!-- Register new key form -->
			<div v-if="showRegisterForm" :class="$style.registerForm">
				<N8nInput
					v-model="newKeyLabel"
					:placeholder="i18n.baseText('settings.personal.securityKeys.label.placeholder')"
					data-test-id="webauthn-label-input"
					@keyup.enter="registerKey"
				/>
				<div :class="$style.registerActions">
					<N8nButton
						:label="i18n.baseText('settings.personal.securityKeys.button.register')"
						:loading="registering"
						:disabled="!newKeyLabel.trim()"
						size="small"
						data-test-id="webauthn-register-confirm-button"
						@click="registerKey"
					/>
					<N8nButton
						:label="i18n.baseText('generic.cancel')"
						variant="outline"
						size="small"
						@click="showRegisterForm = false"
					/>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="!showRegisterForm"
					:label="i18n.baseText('settings.personal.securityKeys.button.addNew')"
					data-test-id="webauthn-add-key-button"
					@click="showRegisterForm = true"
				/>
				<N8nButton :label="i18n.baseText('generic.close')" variant="outline" @click="closeModal" />
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.credentialsList {
	margin-bottom: var(--spacing--sm);
}

.credentialRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-2);

	&:last-child {
		border-bottom: none;
	}
}

.credentialInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.credentialActions {
	display: flex;
	gap: var(--spacing--4xs);
}

.editRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
}

.emptyState {
	padding: var(--spacing--lg) 0;
	text-align: center;
}

.registerForm {
	margin-top: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.registerActions {
	display: flex;
	gap: var(--spacing--xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.recoveryCodes {
	background-color: var(--color--warning--tint-2);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.recoveryCodesWarning {
	display: block;
	margin-bottom: var(--spacing--xs);
}

.recoveryCodesList {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--4xs);

	code {
		font-size: var(--font-size--2xs);
		background-color: var(--color--background);
		padding: var(--spacing--4xs) var(--spacing--2xs);
		border-radius: var(--radius--sm);
	}
}
</style>
