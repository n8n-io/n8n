import { builderCreditsUpdated } from './builderCreditsUpdated';
import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import { useBuilderStore } from '@/features/assistant/builder.store';

vi.mock('@/features/assistant/builder.store', () => ({
	useBuilderStore: vi.fn(),
}));

describe('builderCreditsUpdated', () => {
	it('should update builder credits in the store', async () => {
		const mockUpdateBuilderCredits = vi.fn();
		const mockStore = {
			updateBuilderCredits: mockUpdateBuilderCredits,
		} as unknown as ReturnType<typeof useBuilderStore>;

		vi.mocked(useBuilderStore).mockReturnValue(mockStore);

		const event: BuilderCreditsPushMessage = {
			type: 'updateBuilderCredits',
			data: {
				creditsQuota: 1000,
				creditsClaimed: 250,
			},
		};

		await builderCreditsUpdated(event);

		expect(mockUpdateBuilderCredits).toHaveBeenCalledWith(1000, 250);
	});
});
