import { setActivePinia, createPinia } from 'pinia';

const syncThread = vi.fn().mockResolvedValue(undefined);
const sendMessage = vi.fn().mockResolvedValue(undefined);
const setPendingPrefill = vi.fn();
const getOrCreateRuntime = vi.fn(() => ({ sendMessage }));
const track = vi.fn();
const push = vi.fn().mockResolvedValue(undefined);

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({ syncThread, getOrCreateRuntime, setPendingPrefill }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'push-ref', instanceId: 'instance-1' }),
}));
vi.mock('@/app/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import { useInstanceAiLauncher } from '../useInstanceAiLauncher';

describe('useInstanceAiLauncher', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('auto-sends for internal launches', async () => {
		const { launch } = useInstanceAiLauncher();
		await launch({ message: 'hi', source: 'template-view', origin: 'internal', autoSend: true });

		expect(syncThread).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ source: 'template-view', origin: 'internal' }),
		);
		expect(sendMessage).toHaveBeenCalledWith('hi', undefined, 'push-ref');
		expect(setPendingPrefill).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledWith(
			'User launched Instance AI thread',
			expect.objectContaining({ source: 'template-view', origin: 'internal', auto_send: true }),
		);
	});

	it('never auto-sends for external launches, even when asked', async () => {
		const { launch } = useInstanceAiLauncher();
		await launch({ message: 'hi', source: 'external-link', origin: 'external', autoSend: true });

		expect(sendMessage).not.toHaveBeenCalled();
		expect(setPendingPrefill).toHaveBeenCalledWith(expect.any(String), 'hi');
		expect(track).toHaveBeenCalledWith(
			'User launched Instance AI thread',
			expect.objectContaining({ origin: 'external', auto_send: false }),
		);
	});
});
