<script setup lang="ts">
import { onMounted } from 'vue';
import type { MessengerPlatform } from '@n8n/api-types';
import { BaseTextKey, useI18n } from '@n8n/i18n';
import { N8nButton, N8nInputLabel, N8nTooltip } from '@n8n/design-system';

import {
	MESSENGER_LINK_ACCOUNT_MODAL_KEY,
	MESSENGER_MANAGE_ACCOUNT_MODAL_KEY,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useMessengerAccountsStore } from '@/features/core/auth/stores/messengerAccounts.store';

type PlatformDescriptor = {
	platform: MessengerPlatform;
	labelKey: BaseTextKey;
};

const PLATFORMS: PlatformDescriptor[] = [
	{ platform: 'telegram', labelKey: 'settings.personal.messenger.platform.telegram' },
];

const i18n = useI18n();
const uiStore = useUIStore();
const messengerStore = useMessengerAccountsStore();
const toast = useToast();

onMounted(async () => {
	try {
		await messengerStore.fetchAccounts();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.personal.messenger.section.title'));
	}
});

function onPlatformClick(platform: MessengerPlatform) {
	if (messengerStore.isConnected(platform)) {
		uiStore.openModalWithData({
			name: MESSENGER_MANAGE_ACCOUNT_MODAL_KEY,
			data: { platform },
		});
	} else {
		uiStore.openModal(MESSENGER_LINK_ACCOUNT_MODAL_KEY);
	}
}

function onLinkNewAccountClick() {
	uiStore.openModal(MESSENGER_LINK_ACCOUNT_MODAL_KEY);
}
</script>

<template>
	<div data-test-id="messenger-platforms-section">
		<N8nInputLabel :label="i18n.baseText('settings.personal.messenger.section.title')" />
		<div :class="$style.iconsRow">
			<N8nTooltip v-for="entry in PLATFORMS" :key="entry.platform" placement="top">
				<template #content>{{ i18n.baseText(entry.labelKey) }}</template>
				<button
					:class="[
						$style.iconButton,
						{ [$style.isDisconnected]: !messengerStore.isConnected(entry.platform) },
					]"
					:data-test-id="`messenger-icon-${entry.platform}`"
					type="button"
					@click="onPlatformClick(entry.platform)"
				>
					<svg
						v-if="entry.platform === 'telegram'"
						viewBox="0 0 240 240"
						width="40"
						height="40"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="telegram-gradient" x1=".667" x2=".417" y1=".167" y2=".75">
								<stop offset="0" stop-color="#37aee2" />
								<stop offset="1" stop-color="#1e96c8" />
							</linearGradient>
						</defs>
						<circle cx="120" cy="120" r="120" fill="url(#telegram-gradient)" />
						<path
							fill="#fff"
							d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687 30.255-29.492 30.255-29.492l31.525-60.89-79.703 37.314z"
						/>
						<path
							fill="#c8daea"
							d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0 17.415-15.763 17.415-15.763"
						/>
						<path
							fill="#fff"
							d="M81.486 130.178L52.2 120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229 2.1-2.2 6.489-4.523 120.106-45.36 120.106-45.36s3.208-1.081 5.1-.362a2.766 2.766 0 0 1 1.885 2.055 9.357 9.357 0 0 1 .254 2.585c-.009.752-.1 1.449-.169 2.542-.692 11.165-21.4 94.493-21.4 94.493s-1.239 4.876-5.678 5.043a8.13 8.13 0 0 1-5.92-2.292c-8.711-7.493-38.819-27.727-45.472-32.177a1.27 1.27 0 0 1-.547-.9c-.09-.469.42-1.05.42-1.05s52.426-46.6 53.821-51.492c.108-.379-.3-.566-.848-.4-3.482 1.281-63.844 39.4-70.506 43.607a3.21 3.21 0 0 1-1.48.09z"
						/>
					</svg>
				</button>
			</N8nTooltip>
		</div>
		<N8nButton
			variant="subtle"
			:label="i18n.baseText('settings.personal.messenger.linkNewAccount')"
			data-test-id="link-messenger-account-button"
			@click="onLinkNewAccountClick"
		/>
	</div>
</template>

<style lang="scss" module>
.iconsRow {
	display: flex;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--xs);
}

.iconButton {
	background: transparent;
	border: 0;
	padding: 0;
	cursor: pointer;
	border-radius: var(--border-radius--base);
	transition: opacity 0.15s ease;

	&:hover,
	&:focus-visible {
		opacity: 0.85;
	}
}

.isDisconnected {
	opacity: 0.6;
}
</style>
