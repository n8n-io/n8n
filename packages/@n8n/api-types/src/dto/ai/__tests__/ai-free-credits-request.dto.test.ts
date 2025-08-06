import { nanoId } from 'minifaker';

import { AiFreeCreditsRequestDto } from '../ai-free-credits-request.dto';
import 'minifaker/locales/en';

describe('AiChatRequestDto', () => {
	it('should succeed if projectId is a valid nanoid', () => {
		const validRequest = {
			projectId: nanoId.nanoid(),
		};

		const result = AiFreeCreditsRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});

	it('should succeed if no projectId is sent', () => {
		const result = AiFreeCreditsRequestDto.safeParse({});

		expect(result.success).toBe(true);
	});

	it('should fail is projectId invalid value', () => {
		const validRequest = {
			projectId: '',
		};

		const result = AiFreeCreditsRequestDto.safeParse(validRequest);

		expect(result.success).toBe(false);
	});
});
