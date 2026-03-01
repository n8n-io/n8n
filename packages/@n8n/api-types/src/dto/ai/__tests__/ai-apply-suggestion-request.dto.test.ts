import { AiApplySuggestionRequestDto } from '../ai-apply-suggestion-request.dto';

describe('AiApplySuggestionRequestDto', () => {
	it('should validate a valid suggestion application request', () => {
		const validRequest = {
			sessionId: 'session-123',
			suggestionId: 'suggestion-456',
		};

		const result = AiApplySuggestionRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});

	it('should fail if sessionId is missing', () => {
		const invalidRequest = {
			suggestionId: 'suggestion-456',
		};

		const result = AiApplySuggestionRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['sessionId']);
	});

	it('should fail if suggestionId is missing', () => {
		const invalidRequest = {
			sessionId: 'session-123',
		};

		const result = AiApplySuggestionRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['suggestionId']);
	});
});
