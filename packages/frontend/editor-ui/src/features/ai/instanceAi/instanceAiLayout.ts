import { useSessionStorage } from '@vueuse/core';
import type { InjectionKey, Ref } from 'vue';
import { inject, provide, ref } from 'vue';

/**
 * Sidebar collapse state, provided by the chat layout (`InstanceAiView.vue`,
 * `AppBuilderView.vue`) to the views inside it. Inner views read this to render
 * the collapsed-mode sidebar toggle in their own header.
 */
export interface SidebarState {
	collapsed: Ref<boolean>;
	width?: Ref<number>;
	toggle: () => void;
}

/**
 * Narrows the thread sidebar to one app's threads, linked to that app's page.
 * `appId` is absent on the new-app page until the agent creates the app.
 */
export interface AppThreadScope {
	appId?: string;
	projectId: string;
	name: string;
}

export const SidebarStateKey: InjectionKey<SidebarState> = Symbol('instanceAiSidebar');

/**
 * Set by the app page (`AppBuilderView.vue`): the thread view then keeps the app
 * panel open, drops the artifacts sidebar, and swaps the chat header's controls
 * for back / history / collapse-chat. Absent on the assistant page.
 */
export const AppThreadScopeKey: InjectionKey<Ref<AppThreadScope>> = Symbol(
	'instanceAiAppThreadScope',
);

export function useAppThreadScope(): Ref<AppThreadScope> | null {
	return inject(AppThreadScopeKey, null);
}

export function useSidebarState(): SidebarState {
	const state = inject(SidebarStateKey, null);
	if (!state) {
		throw new Error('useSidebarState() requires an InstanceAiView ancestor.');
	}
	return state;
}

/**
 * Owns the thread sidebar's collapse and width and provides them to descendants.
 * Session-scoped: survives a refresh; `InstanceAiView` resets it when the user
 * leaves the chat namespace.
 */
export function provideSidebarState() {
	const collapsed = useSessionStorage('instanceAi.sidebarCollapsed', true);
	const width = ref(260);

	const toggle = () => {
		collapsed.value = !collapsed.value;
	};

	// Drag below min-width threshold → auto-collapse
	const handleResize = ({ width: next }: { width: number }) => {
		if (next <= 200) {
			collapsed.value = true;
			return;
		}
		width.value = next;
	};

	provide(SidebarStateKey, { collapsed, width, toggle });

	return { collapsed, width, toggle, handleResize };
}
