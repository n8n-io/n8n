import type { PushMessage } from '@n8n/api-types';
import { pushHandlerRegistry } from '@n8n/frontend-module-sdk';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createRouter, createWebHistory, useRoute, useRouter } from 'vue-router';

import { useModulePushDispatcher } from './useModulePushDispatcher';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';

const addEventListener = vi.fn((_handler: OnPushMessageHandler) => vi.fn());

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener }),
}));

/** Stands in for a module store that injects, as `instanceAi.store` does via `useToast`. */
const useProbeStore = defineStore('probe', () => {
	const route = useRoute();
	return { routeName: route?.name ?? null };
});

const CREDITS_EVENT = {
	type: 'updateInstanceAiCredits',
	data: { creditsQuota: 100, creditsClaimed: 1 },
} as unknown as PushMessage;

describe('useModulePushDispatcher — app context', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pushHandlerRegistry.clear();
	});

	it('lets a handler create an injecting store on the first push, with no component mounted', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const pinia = createPinia();
		const router = createRouter({
			history: createWebHistory(),
			routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
		});

		const TestComponent = defineComponent({
			setup() {
				useModulePushDispatcher({ router: useRouter() });
			},
			template: '<div />',
		});
		mount(TestComponent, { global: { plugins: [pinia, router] } });
		await router.isReady();
		setActivePinia(pinia);

		let routeName: string | null | undefined;
		pushHandlerRegistry.register('updateInstanceAiCredits', async () => {
			// The real descriptor awaits a lazy import before it touches the store.
			await Promise.resolve();
			routeName = useProbeStore().routeName as string | null;
		});

		addEventListener.mock.calls[0][0](CREDITS_EVENT);
		await flushPromises();

		// `app.use(pinia)` sets `pinia._a`, and Pinia runs a setup store inside that
		// app context. So the store's `inject` resolves even off the component tree.
		expect(routeName).toBe('home');
		expect(warn.mock.calls.flat().join(' ')).not.toContain('inject()');
		warn.mockRestore();
	});
});
