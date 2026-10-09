import { beforeEach, describe, expect, it } from 'vitest';

import {
	consumePendingFirstMessage,
	stashPendingFirstMessage,
} from '../../instanceAi.pendingFirstMessage';
import { USER_TYPED_MESSAGE } from '../../prefills';

const THREAD_ID = 'thread-run-target';
const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';

describe('pending first message run target', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns the run target that was stashed with the opener', () => {
		stashPendingFirstMessage(THREAD_ID, {
			message: 'Build a report',
			authorship: USER_TYPED_MESSAGE,
			runTarget: { kind: 'linked', instanceId: OFFICE_ID },
		});

		expect(consumePendingFirstMessage(THREAD_ID)).toEqual(
			expect.objectContaining({
				message: 'Build a report',
				runTarget: { kind: 'linked', instanceId: OFFICE_ID },
			}),
		);
	});

	it('keeps the opener and drops a stored run target that is not valid', () => {
		localStorage.setItem(
			`n8n-instance-ai-first-message:${THREAD_ID}`,
			JSON.stringify({
				message: 'Build a report',
				authorship: USER_TYPED_MESSAGE,
				runTarget: { kind: 'linked', instanceId: 'not-a-uuid' },
			}),
		);

		const pending = consumePendingFirstMessage(THREAD_ID);

		expect(pending?.message).toBe('Build a report');
		expect(pending?.runTarget).toBeUndefined();
	});

	it('returns no run target for an opener that was stashed without one', () => {
		stashPendingFirstMessage(THREAD_ID, {
			message: 'Build a report',
			authorship: USER_TYPED_MESSAGE,
		});

		expect(consumePendingFirstMessage(THREAD_ID)?.runTarget).toBeUndefined();
	});
});
