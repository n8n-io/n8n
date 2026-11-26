import { SkillSourceRequestError } from '../errors/skill-source-request.error';
import { SkillSourceToolBudget } from '../services/skill-source-tool-budget';

describe('SkillSourceToolBudget', () => {
	const MINUTE = 60 * 1000;
	const takeTimes = (budget: SkillSourceToolBudget, userId: string, times: number, now: number) => {
		for (let request = 0; request < times; request++) budget.take(userId, now);
	};

	it('allows 15 requests of one user in 5 minutes, and refuses the next as rate limited', () => {
		const budget = new SkillSourceToolBudget();
		takeTimes(budget, 'user-1', 15, 0);

		const refused = () => budget.take('user-1', 4 * MINUTE);

		expect(refused).toThrow(SkillSourceRequestError);
		expect(refused).toThrow(expect.objectContaining({ reason: 'rate_limited' }));
	});

	it('counts each user alone', () => {
		const budget = new SkillSourceToolBudget();
		takeTimes(budget, 'user-1', 15, 0);

		expect(() => budget.take('user-2', 0)).not.toThrow();
	});

	it('allows a request again when the oldest ones are 5 minutes old', () => {
		const budget = new SkillSourceToolBudget();
		takeTimes(budget, 'user-1', 15, 0);

		expect(() => budget.take('user-1', 5 * MINUTE)).not.toThrow();
	});

	it('does not count a refused request, so the wait does not grow', () => {
		const budget = new SkillSourceToolBudget();
		takeTimes(budget, 'user-1', 15, 0);
		expect(() => budget.take('user-1', 4 * MINUTE)).toThrow();

		expect(() => takeTimes(budget, 'user-1', 15, 5 * MINUTE)).not.toThrow();
	});
});
