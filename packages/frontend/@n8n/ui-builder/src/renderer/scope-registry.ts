import { type InjectionKey, shallowRef } from 'vue';

import type { UiScope } from '../core/types';

/**
 * What each node is currently being rendered with, so the inspector can preview
 * and autocomplete against the values on screen rather than a guess at them.
 *
 * One-directional: the renderer only ever writes, the inspector only ever
 * reads, and the served runtime provides no registry at all.
 *
 * A node inside a repeat renders once per element under a single id, and
 * selection is by id, so there is no selected element to speak of: only the
 * first iteration publishes, and the preview shows the first item.
 */
export interface UiScopeRegistry {
	publish: (nodeId: string, scope: UiScope) => void;
	forget: (nodeId: string) => void;
	scopeFor: (nodeId: string | undefined) => UiScope | undefined;
}

export const UiScopeRegistryKey: InjectionKey<UiScopeRegistry> = Symbol('uiScopeRegistry');

export function createScopeRegistry(): UiScopeRegistry {
	const scopes = shallowRef<Record<string, UiScope>>({});

	return {
		publish(nodeId, scope) {
			if (scopes.value[nodeId] === scope) return;
			scopes.value = { ...scopes.value, [nodeId]: scope };
		},
		forget(nodeId) {
			if (!(nodeId in scopes.value)) return;
			const { [nodeId]: _removed, ...rest } = scopes.value;
			scopes.value = rest;
		},
		scopeFor(nodeId) {
			return nodeId ? scopes.value[nodeId] : undefined;
		},
	};
}
