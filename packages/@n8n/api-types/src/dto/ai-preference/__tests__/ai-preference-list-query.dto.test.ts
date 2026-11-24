import { AiPreferenceListQueryDto } from '../ai-preference-list-query.dto';

describe('AiPreferenceListQueryDto', () => {
	describe('search', () => {
		it('trims the term', () => {
			expect(AiPreferenceListQueryDto.parse({ search: ' short ' }).search).toBe('short');
		});

		it.each(['', '   '])('drops a blank term (%j)', (search) => {
			expect(AiPreferenceListQueryDto.parse({ search }).search).toBeUndefined();
		});

		it('is optional', () => {
			expect(AiPreferenceListQueryDto.parse({}).search).toBeUndefined();
		});

		it('rejects a term over 200 characters', () => {
			expect(AiPreferenceListQueryDto.safeParse({ search: 'a'.repeat(201) }).success).toBe(false);
			expect(AiPreferenceListQueryDto.safeParse({ search: 'a'.repeat(200) }).success).toBe(true);
		});
	});
});
