import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';
import type { IUsedCredential } from '@/features/credentials/credentials.types';

export type UsedCredentialsPayload = {
	usedCredentials: Record<string, IUsedCredential>;
};

export type UsedCredentialsChangeEvent = ChangeEvent<UsedCredentialsPayload>;

export function useWorkflowDocumentUsedCredentials() {
	const usedCredentials = ref<Record<string, IUsedCredential>>({});

	const onUsedCredentialsChange = createEventHook<UsedCredentialsChangeEvent>();

	function applyUsedCredentials(
		value: Record<string, IUsedCredential>,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		usedCredentials.value = value;
		void onUsedCredentialsChange.trigger({ action, payload: { usedCredentials: value } });
	}

	function setUsedCredentials(data: IUsedCredential[]) {
		const record = data.reduce<Record<string, IUsedCredential>>((accu, credential) => {
			accu[credential.id] = credential;
			return accu;
		}, {});
		applyUsedCredentials(record);
	}

	return {
		usedCredentials: readonly(usedCredentials),
		setUsedCredentials,
		onUsedCredentialsChange: onUsedCredentialsChange.on,
	};
}
