import type { SelfHealingChatHandoff } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { computed, defineComponent, getCurrentInstance, ref } from 'vue';

import { INSTANCE_AI_THREAD_VIEW } from '../../constants';
import { useSelfHealingChatHandoff } from '../useSelfHealingChatHandoff';

const mocks = vi.hoisted(() => ({ push: vi.fn(), useRouter: vi.fn(), showError: vi.fn() }));
const ready = ref(true);

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => computed(() => ready.value),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: mocks.useRouter,
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));

function createHandoff() {
	let handoff: SelfHealingChatHandoff | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				handoff = useSelfHealingChatHandoff();
				return () => null;
			},
		}),
	)();
	if (!handoff) throw new Error('The handoff was not initialized.');
	return handoff;
}

beforeEach(() => {
	vi.resetAllMocks();
	ready.value = true;
	mocks.useRouter.mockImplementation(() => {
		expect(getCurrentInstance()).not.toBeNull();
		return { push: mocks.push };
	});
});

it('opens the existing backend thread using a router initialized during setup', async () => {
	const handoff = createHandoff();
	expect(mocks.push).not.toHaveBeenCalled();

	await expect(handoff.start({ threadId: 'private-thread' })).resolves.toBe(true);

	expect(mocks.useRouter).toHaveBeenCalledOnce();
	expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
		name: INSTANCE_AI_THREAD_VIEW,
		params: { threadId: 'private-thread' },
	});
});

it('reopens the same thread on a later request', async () => {
	const handoff = createHandoff();
	await handoff.start({ threadId: 'private-thread' });
	await handoff.start({ threadId: 'private-thread' });

	expect(mocks.push).toHaveBeenCalledTimes(2);
	expect(mocks.push).toHaveBeenLastCalledWith({
		name: INSTANCE_AI_THREAD_VIEW,
		params: { threadId: 'private-thread' },
	});
});

it('tracks Assistant readiness and does not navigate when it becomes unavailable', async () => {
	const handoff = createHandoff();
	expect(handoff.available.value).toBe(true);
	ready.value = false;

	await expect(handoff.start({ threadId: 'private-thread' })).resolves.toBe(false);

	expect(handoff.available.value).toBe(false);
	expect(mocks.push).not.toHaveBeenCalled();
});

it.each(['returned', 'thrown'] as const)(
	'reports a %s navigation failure without changing the saved thread',
	async (failure) => {
		const cause = new Error('Navigation failed');
		if (failure === 'returned') mocks.push.mockResolvedValue(cause);
		else mocks.push.mockRejectedValue(cause);

		await expect(createHandoff().start({ threadId: 'private-thread' })).resolves.toBe(false);

		expect(mocks.showError).toHaveBeenCalledExactlyOnceWith(cause, "Couldn't open chat");
		expect(mocks.push).toHaveBeenCalledOnce();
	},
);
