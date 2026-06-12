<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import { MESSENGER_LINK_ACCOUNT_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useMessengerAccountsStore } from '@/features/core/auth/stores/messengerAccounts.store';

const AUTO_CLOSE_MS = 3000;

const i18n = useI18n();
const uiStore = useUIStore();
const messengerStore = useMessengerAccountsStore();

const CODE_LENGTH = 6;

const code = ref('');
const state = ref<'idle' | 'verifying' | 'success' | 'error'>('idle');
const errorMessage = ref('');
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

function close() {
	uiStore.closeModal(MESSENGER_LINK_ACCOUNT_MODAL_KEY);
}

function clearAutoCloseTimer() {
	if (autoCloseTimer !== null) {
		clearTimeout(autoCloseTimer);
		autoCloseTimer = null;
	}
}

async function onVerify() {
	if (code.value.length !== CODE_LENGTH || state.value === 'verifying') return;

	state.value = 'verifying';
	errorMessage.value = '';

	try {
		await messengerStore.linkByCode(code.value);
		state.value = 'success';
		autoCloseTimer = setTimeout(() => {
			close();
		}, AUTO_CLOSE_MS);
	} catch (error) {
		code.value = '';
		errorMessage.value =
			error instanceof Error && error.message
				? error.message
				: i18n.baseText('settings.personal.messenger.link.modal.error.generic');
		state.value = 'error';
	}
}

function onInput(value: string) {
	const digitsOnly = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
	if (digitsOnly !== value) {
		code.value = digitsOnly;
	}
	if (state.value === 'error') {
		state.value = 'idle';
		errorMessage.value = '';
	}
}

onBeforeUnmount(() => {
	clearAutoCloseTimer();
});
</script>

<template>
	<Modal
		:name="MESSENGER_LINK_ACCOUNT_MODAL_KEY"
		:title="i18n.baseText('settings.personal.messenger.link.modal.title')"
		width="460px"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<N8nText size="medium">
					{{ i18n.baseText('settings.personal.messenger.link.modal.description') }}
				</N8nText>
				<N8nInputLabel :label="i18n.baseText('settings.personal.messenger.link.modal.codeLabel')">
					<N8nInput
						v-model="code"
						type="text"
						inputmode="numeric"
						:maxlength="CODE_LENGTH"
						:disabled="state === 'verifying' || state === 'success'"
						:placeholder="i18n.baseText('settings.personal.messenger.link.modal.codePlaceholder')"
						data-test-id="messenger-code-input"
						@update:model-value="onInput"
						@keydown.enter="onVerify"
					/>
				</N8nInputLabel>
				<N8nText
					v-if="state === 'error'"
					:class="$style.errorText"
					data-test-id="messenger-code-error"
				>
					{{ errorMessage }}
				</N8nText>
				<N8nText
					v-else-if="state === 'success'"
					:class="$style.successText"
					data-test-id="messenger-code-success"
				>
					{{ i18n.baseText('settings.personal.messenger.link.modal.success') }}
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					:label="i18n.baseText('settings.personal.messenger.link.modal.cancel')"
					:disabled="state === 'verifying'"
					@click="close"
				/>
				<N8nButton
					:label="i18n.baseText('settings.personal.messenger.link.modal.verify')"
					:loading="state === 'verifying'"
					:disabled="code.length !== CODE_LENGTH || state === 'verifying' || state === 'success'"
					data-test-id="messenger-verify-button"
					@click="onVerify"
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

.errorText {
	color: var(--color--danger);
}

.successText {
	color: var(--color--success);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
