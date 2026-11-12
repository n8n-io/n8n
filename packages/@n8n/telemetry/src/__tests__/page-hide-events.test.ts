import { findPageHideEvent, PAGE_HIDE_EVENTS } from '../page-hide-events';
import { TELEMETRY_EVENT } from '../telemetry-events';

describe('findPageHideEvent', () => {
	it('finds an allowed event by its emitted name', () => {
		const event = TELEMETRY_EVENT.INSTANCE_AI.USER_LEFT_N8N_WHILE_AI_ASSISTANT_RUNNING;

		expect(findPageHideEvent(event.name)).toBe(event);
	});

	it('does not find a registered event that is not allowed', () => {
		const event = TELEMETRY_EVENT.INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD;

		expect(findPageHideEvent(event.name)).toBeUndefined();
	});

	it('does not find an unknown name', () => {
		expect(findPageHideEvent('Not a registered event')).toBeUndefined();
	});

	it('requires a user id on every allowed event, because the backend sets it', () => {
		for (const event of PAGE_HIDE_EVENTS) {
			expect(event.getValidationError({})).toContain('user_id');
		}
	});
});
