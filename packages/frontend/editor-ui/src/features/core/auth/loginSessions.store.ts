import type { LoginSession } from '@n8n/api-types';
import * as loginSessionsApi from '@n8n/rest-api-client/api/login-sessions';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useLoginSessionsStore = defineStore(STORES.LOGIN_SESSIONS, () => {
	const sessions = ref<LoginSession[]>([]);

	const rootStore = useRootStore();

	const hasOtherSessions = computed(() => sessions.value.some((session) => !session.current));

	const fetchSessions = async () => {
		const { items } = await loginSessionsApi.getLoginSessions(rootStore.restApiContext);
		sessions.value = items;
		return items;
	};

	const revokeSession = async (id: string) => {
		await loginSessionsApi.revokeLoginSession(rootStore.restApiContext, id);
		sessions.value = sessions.value.filter((session) => session.id !== id);
	};

	const revokeAllOtherSessions = async () => {
		await loginSessionsApi.revokeAllOtherLoginSessions(rootStore.restApiContext);
		sessions.value = sessions.value.filter((session) => session.current);
	};

	const $reset = () => {
		sessions.value = [];
	};

	return {
		sessions,
		hasOtherSessions,
		fetchSessions,
		revokeSession,
		revokeAllOtherSessions,
		$reset,
	};
});
