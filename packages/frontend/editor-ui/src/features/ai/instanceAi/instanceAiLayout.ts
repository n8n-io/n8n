import type { InjectionKey, Ref } from 'vue';
import { inject, provide } from 'vue';

/**
 * Sidebar collapse state, provided by `InstanceAiView.vue` (the layout) and by
 * the embedded `InstanceAiChatPanel` to their respective descendants. Inner
 * views read this to render the collapsed-mode sidebar toggle in their own
 * header.
 */
export interface SidebarState {
	collapsed: Ref<boolean>;
	width?: Ref<number>;
	toggle: () => void;
}

export const SidebarStateKey: InjectionKey<SidebarState> = Symbol('instanceAiSidebar');

export function useSidebarState(): SidebarState {
	const state = inject(SidebarStateKey, null);
	if (!state) {
		throw new Error('useSidebarState() requires an InstanceAiView ancestor.');
	}
	return state;
}

/** Builds and provides the sidebar state from a host's own collapsed/width refs. */
export function provideSidebarState(collapsed: Ref<boolean>, width: Ref<number>): SidebarState {
	const state: SidebarState = {
		collapsed,
		width,
		toggle: () => (collapsed.value = !collapsed.value),
	};
	provide(SidebarStateKey, state);
	return state;
}
