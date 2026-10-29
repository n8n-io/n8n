import { SkillSourceReadError } from '../errors/skill-source-read.error';
import {
	SkillSourceRequestError,
	toSkillSourceRequestError,
} from '../errors/skill-source-request.error';

describe('toSkillSourceRequestError', () => {
	it('keeps the reason code and the source error as the cause', () => {
		const source = new SkillSourceReadError('rate_limited', 'Try again later.');

		const error = toSkillSourceRequestError(source);

		expect(error).toBeInstanceOf(SkillSourceRequestError);
		expect(error).toMatchObject({ meta: { reason: 'rate_limited' }, httpStatusCode: 429 });
		expect((error as Error).cause).toBe(source);
	});

	it('leaves a bug as it is', () => {
		const bug = new Error('boom');

		expect(toSkillSourceRequestError(bug)).toBe(bug);
	});
});
