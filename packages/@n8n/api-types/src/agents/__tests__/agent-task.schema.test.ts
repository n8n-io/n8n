import { describe, expect, it } from 'vitest';

import { AGENT_TASK_MISFIRE_GRACE_MAX_SECONDS, agentTaskSchema } from '../agent-task.schema';

const validTask = {
	name: 'Daily report',
	objective: 'Prepare the daily report',
	cronExpression: '0 9 * * *',
};

describe('agentTaskSchema misfire settings', () => {
	it('accepts both supported policies and zero through the 30-day grace ceiling', () => {
		for (const misfirePolicy of ['skip', 'coalesce'] as const) {
			expect(
				agentTaskSchema.safeParse({
					...validTask,
					misfirePolicy,
					misfireGraceSeconds: AGENT_TASK_MISFIRE_GRACE_MAX_SECONDS,
				}).success,
			).toBe(true);
		}
		expect(agentTaskSchema.safeParse({ ...validTask, misfireGraceSeconds: 0 }).success).toBe(true);
	});

	it.each([-1, 1.5, AGENT_TASK_MISFIRE_GRACE_MAX_SECONDS + 1])(
		'rejects an invalid grace of %s seconds',
		(misfireGraceSeconds) => {
			expect(agentTaskSchema.safeParse({ ...validTask, misfireGraceSeconds }).success).toBe(false);
		},
	);

	it('rejects unsupported policies', () => {
		expect(
			agentTaskSchema.safeParse({ ...validTask, misfirePolicy: 'coalesce_owner' }).success,
		).toBe(false);
	});
});
