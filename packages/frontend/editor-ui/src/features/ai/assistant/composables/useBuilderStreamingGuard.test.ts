import { createPinia, setActivePinia } from 'pinia';
import { confirmIfBuilderStreaming } from './useBuilderStreamingGuard';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { MODAL_CONFIRM, MODAL_CANCEL } from '@/app/constants';

const confirmMock = vi.fn();

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: confirmMock,
	}),
}));

vi.mock('@n8n/i18n', () => {
	const baseText = (key: string) => key;
	return {
		i18n: { baseText },
		useI18n: () => ({ baseText }),
	};
});

describe('confirmIfBuilderStreaming', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('should proceed without dialog when builder is not streaming', async () => {
		const builderStore = useBuilderStore();
		builderStore.$patch({ streaming: false });

		expect(await confirmIfBuilderStreaming()).toBe(true);
		expect(confirmMock).not.toHaveBeenCalled();
	});

	it('should abort streaming and proceed when user confirms', async () => {
		const builderStore = useBuilderStore();
		builderStore.$patch({ streaming: true });
		const abortSpy = vi.spyOn(builderStore, 'abortStreaming').mockImplementation(() => {});
		confirmMock.mockResolvedValue(MODAL_CONFIRM);

		expect(await confirmIfBuilderStreaming()).toBe(true);
		expect(abortSpy).toHaveBeenCalled();
	});

	it('should not proceed and not abort when user cancels', async () => {
		const builderStore = useBuilderStore();
		builderStore.$patch({ streaming: true });
		const abortSpy = vi.spyOn(builderStore, 'abortStreaming').mockImplementation(() => {});
		confirmMock.mockResolvedValue(MODAL_CANCEL);

		expect(await confirmIfBuilderStreaming()).toBe(false);
		expect(abortSpy).not.toHaveBeenCalled();
	});
});
