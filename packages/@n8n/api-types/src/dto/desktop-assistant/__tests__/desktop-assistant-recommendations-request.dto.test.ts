import { DesktopAssistantRecommendationsRequestDto } from '../desktop-assistant-recommendations-request.dto';

describe('DesktopAssistantRecommendationsRequestDto', () => {
	describe('Valid requests', () => {
		test('empty body (no context) validates', () => {
			const result = DesktopAssistantRecommendationsRequestDto.safeParse({});
			expect(result.success).toBe(true);
		});

		test('structured context validates', () => {
			const result = DesktopAssistantRecommendationsRequestDto.safeParse({
				context: {
					kind: 'browser',
					app: 'Google Chrome',
					windowTitle: 'Dashboard',
					url: 'https://example.com',
				},
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test('unknown context kind fails', () => {
			const result = DesktopAssistantRecommendationsRequestDto.safeParse({
				context: { kind: 'spreadsheet' },
			});
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['context', 'kind']);
		});
	});
});
