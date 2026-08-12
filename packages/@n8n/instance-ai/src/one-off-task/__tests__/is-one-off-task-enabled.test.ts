import { isOneOffTaskEnabled } from '../is-one-off-task-enabled';

describe('isOneOffTaskEnabled', () => {
	it('is enabled only when the env flag is exactly "true"', () => {
		expect(isOneOffTaskEnabled({ N8N_INSTANCE_AI_ONE_OFF_TASKS: 'true' })).toBe(true);
		expect(isOneOffTaskEnabled({ N8N_INSTANCE_AI_ONE_OFF_TASKS: '1' })).toBe(false);
		expect(isOneOffTaskEnabled({ N8N_INSTANCE_AI_ONE_OFF_TASKS: 'false' })).toBe(false);
		expect(isOneOffTaskEnabled({})).toBe(false);
	});
});
