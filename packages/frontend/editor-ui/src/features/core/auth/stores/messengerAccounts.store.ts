import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { MessengerAccountDto, MessengerPlatform } from '@n8n/api-types';

import * as messengerApi from '@/app/api/messenger-accounts';

export const useMessengerAccountsStore = defineStore('messengerAccounts', () => {
	const rootStore = useRootStore();

	const accountsByPlatform = ref<Partial<Record<MessengerPlatform, MessengerAccountDto>>>({});

	const isConnected = computed(() => (platform: MessengerPlatform) => {
		return Boolean(accountsByPlatform.value[platform]);
	});

	const getAccount = computed(() => (platform: MessengerPlatform) => {
		return accountsByPlatform.value[platform];
	});

	async function fetchAccounts() {
		const accounts = await messengerApi.getMessengerAccounts(rootStore.restApiContext);
		const next: Partial<Record<MessengerPlatform, MessengerAccountDto>> = {};
		for (const account of accounts) {
			next[account.platform] = account;
		}
		accountsByPlatform.value = next;
	}

	async function linkByCode(code: string): Promise<MessengerAccountDto> {
		const account = await messengerApi.verifyMessengerCode(rootStore.restApiContext, code);
		accountsByPlatform.value = {
			...accountsByPlatform.value,
			[account.platform]: account,
		};
		return account;
	}

	async function unlink(platform: MessengerPlatform): Promise<void> {
		await messengerApi.unlinkMessengerAccount(rootStore.restApiContext, platform);
		const next = { ...accountsByPlatform.value };
		delete next[platform];
		accountsByPlatform.value = next;
	}

	return {
		accountsByPlatform,
		isConnected,
		getAccount,
		fetchAccounts,
		linkByCode,
		unlink,
	};
});
