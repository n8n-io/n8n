import type { PushMessage } from '@n8n/api-types';
import { pushHandlerRegistry } from '@n8n/frontend-module-sdk';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

import { useModulePushDispatcher } from './useModulePushDispatcher';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';

const removeEventListener = vi.fn();
const addEventListener = vi.fn((_handler: OnPushMessageHandler) => removeEventListener);

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener,
	}),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
	useRoute: vi.fn(),
}));

const CREDITS_EVENT = {
	type: 'updateInstanceAiCredits',
	data: { creditsQuota: 100, creditsClaimed: 1 },
} as unknown as PushMessage;

describe('useModulePushDispatcher', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pushHandlerRegistry.clear();
		setActivePinia(createPinia());
	});

	const mountDispatcher = () => {
		const TestComponent = defineComponent({
			setup() {
				useModulePushDispatcher({ router: useRouter() });
			},
			template: '<div></div>',
		});

		return mount(TestComponent);
	};

	const emitPush = async (event: PushMessage) => {
		const listener = addEventListener.mock.calls[0][0];
		listener(event);
		await flushPromises();
	};

	it('should attach one push listener on mount', () => {
		mountDispatcher();

		expect(addEventListener).toHaveBeenCalledTimes(1);
	});

	it('should detach the push listener on unmount', () => {
		mountDispatcher().unmount();

		expect(removeEventListener).toHaveBeenCalledTimes(1);
	});

	it('should dispatch to the module handler registered for the event type', async () => {
		const moduleHandler = vi.fn();
		pushHandlerRegistry.register('updateInstanceAiCredits', moduleHandler);
		mountDispatcher();

		await emitPush(CREDITS_EVENT);

		expect(moduleHandler).toHaveBeenCalledTimes(1);
		expect(moduleHandler).toHaveBeenCalledWith(CREDITS_EVENT, { router: expect.any(Object) });
	});

	it('should ignore an event type no module owns', async () => {
		const moduleHandler = vi.fn();
		pushHandlerRegistry.register('updateInstanceAiCredits', moduleHandler);
		mountDispatcher();

		await emitPush({ type: 'executionStarted', data: {} } as unknown as PushMessage);

		expect(moduleHandler).not.toHaveBeenCalled();
	});

	it('should dispatch without an editor in scope, so any layout is served', async () => {
		const receivedContexts: Array<Record<string, unknown>> = [];
		pushHandlerRegistry.register('updateInstanceAiCredits', (_event, context) => {
			receivedContexts.push(context as unknown as Record<string, unknown>);
		});
		mountDispatcher();

		await emitPush(CREDITS_EVENT);

		expect(receivedContexts).toHaveLength(1);
		expect(Object.keys(receivedContexts[0])).toEqual(['router']);
	});
});
