import { useBasePageRedirectionHelper } from '@n8n/stores/composables/useBasePageRedirectionHelper';

import { usePageRedirectionHelper } from './usePageRedirectionHelper';
import { confirmIfBuilderStreaming } from '@/features/ai/assistant/composables/useBuilderStreamingGuard';

vi.mock('@n8n/stores/composables/useBasePageRedirectionHelper', () => ({
	useBasePageRedirectionHelper: vi.fn(() => ({
		goToCloudDashboard: vi.fn(),
		goToDashboard: vi.fn(),
		goToVersions: vi.fn(),
		goToUpgrade: vi.fn(),
	})),
}));

vi.mock('@/features/ai/assistant/composables/useBuilderStreamingGuard', () => ({
	confirmIfBuilderStreaming: vi.fn(),
}));

describe('usePageRedirectionHelper (app wrapper)', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to the core composable with the builder streaming guard bound', () => {
		const helper = usePageRedirectionHelper();

		// The feature guard is bound here so every app CTA is covered by default.
		expect(useBasePageRedirectionHelper).toHaveBeenCalledWith({ guard: confirmIfBuilderStreaming });
		// The core composable's API is returned unchanged.
		expect(helper).toEqual(
			expect.objectContaining({
				goToCloudDashboard: expect.any(Function),
				goToDashboard: expect.any(Function),
				goToVersions: expect.any(Function),
				goToUpgrade: expect.any(Function),
			}),
		);
	});
});
