import type { InjectionKey, Ref } from 'vue';
import { inject } from 'vue';

/**
 * Sidebar collapse state, provided by `InstanceAiView.vue` (the layout) to
 * its route children. Inner views read this to render the collapsed-mode
 * sidebar toggle in their own header.
 */
export interface SidebarState {
	collapsed: Ref<boolean>;
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
