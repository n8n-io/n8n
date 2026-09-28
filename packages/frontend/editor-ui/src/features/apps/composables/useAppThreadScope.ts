import type { InjectionKey, Ref } from 'vue';
import { inject } from 'vue';

/**
 * Binds the Assistant thread view to one app's page.
 * `appId` is absent on the new-app page until the agent creates the app.
 */
export interface AppThreadScope {
	appId?: string;
	projectId: string;
	name: string;
}

/**
 * Set by the app page (`AppBuilderView.vue`): the thread view then keeps the app
 * panel open, drops the artifacts sidebar, and leads its header back to the apps
 * list. Absent on the assistant page.
 */
export const AppThreadScopeKey: InjectionKey<Ref<AppThreadScope>> = Symbol(
	'instanceAiAppThreadScope',
);

export function useAppThreadScope(): Ref<AppThreadScope> | null {
	return inject(AppThreadScopeKey, null);
}
