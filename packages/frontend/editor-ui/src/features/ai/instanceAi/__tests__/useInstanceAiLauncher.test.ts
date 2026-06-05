import { setActivePinia, createPinia } from 'pinia';

const syncThread = vi.fn().mockResolvedValue(undefined);
const setPendingPrefill = vi.fn();
const setPendingAutoSend = vi.fn();
const track = vi.fn();
const push = vi.fn().mockResolvedValue(undefined);

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({ syncThread, setPendingPrefill, setPendingAutoSend }),
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

	it('queues an auto-send for internal launches', async () => {
		const { launch } = useInstanceAiLauncher();
		await launch({ message: 'hi', source: 'template-view', origin: 'internal', autoSend: true });

		expect(syncThread).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ source: 'template-view', origin: 'internal' }),
		);
		expect(setPendingAutoSend).toHaveBeenCalledWith(expect.any(String), 'hi');
		expect(setPendingPrefill).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledWith(
			'User launched Instance AI thread',
			expect.objectContaining({ source: 'template-view', origin: 'internal', auto_send: true }),
		);
	});

	it('never auto-sends for external launches, even when asked — prefill only', async () => {
		const { launch } = useInstanceAiLauncher();
		await launch({ message: 'hi', source: 'external-link', origin: 'external', autoSend: true });

		expect(setPendingAutoSend).not.toHaveBeenCalled();
		expect(setPendingPrefill).toHaveBeenCalledWith(expect.any(String), 'hi');
		expect(track).toHaveBeenCalledWith(
			'User launched Instance AI thread',
			expect.objectContaining({ origin: 'external', auto_send: false }),
		);
	});
});
