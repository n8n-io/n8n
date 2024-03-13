import { setActivePinia, createPinia } from 'pinia';
import { useAIStore } from '@/stores/ai.store';
import * as aiApi from '@/api/ai';

vi.mock('@/api/ai', () => ({
	debugError: vi.fn(),
}));

vi.mock('@/stores/n8nRoot.store', () => ({
	useRootStore: () => ({
		getRestApiContext: {
			/* Mocked context */
		},
	}),
}));

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: {
			ai: {
				errorDebugging: false, // Default mock value
			},
		},
	}),
}));

describe('useAIStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('isErrorDebuggingEnabled', () => {
		it('reflects error debugging setting from settingsStore', () => {
			const aiStore = useAIStore();
			expect(aiStore.isErrorDebuggingEnabled).toBe(false);
		});
	});

	describe('debugError()', () => {
		it('calls aiApi.debugError with correct parameters and returns expected result', async () => {
			const mockResult = { message: 'This is an example' };
			const aiStore = useAIStore();
			const payload = {
				error: new Error('Test error'),
			};

			vi.mocked(aiApi.debugError).mockResolvedValue(mockResult);

			const result = await aiStore.debugError(payload);

			expect(aiApi.debugError).toHaveBeenCalledWith({}, payload);
			expect(result).toEqual(mockResult);
		});
	});
});
