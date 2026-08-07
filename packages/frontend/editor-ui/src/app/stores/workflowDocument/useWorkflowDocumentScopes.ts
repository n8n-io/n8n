import { readonly, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { Scope } from '@n8n/permissions';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type ScopesPayload = {
	scopes: Scope[];
};

export type ScopesChangeEvent = ChangeEvent<ScopesPayload>;

export function useWorkflowDocumentScopes() {
	const scopes = ref<Scope[]>([]);

	const onScopesChange = createEventHook<ScopesChangeEvent>();

	function applyScopes(newScopes: Scope[], action: ChangeAction = CHANGE_ACTION.UPDATE) {
		scopes.value = newScopes;
		void onScopesChange.trigger({ action, payload: { scopes: newScopes } });
	}

	function setScopes(newScopes: Scope[]) {
		applyScopes(newScopes);
	}

	return {
		scopes: readonly(scopes),
		setScopes,
		onScopesChange: onScopesChange.on,
	};
}
