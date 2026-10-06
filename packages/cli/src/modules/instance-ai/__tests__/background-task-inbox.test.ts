import type { BackgroundTaskInboxItem } from '@n8n/instance-ai';

import { BackgroundTaskInbox, renderInboxMessage } from '../background-task-inbox';

function item(overrides: Partial<BackgroundTaskInboxItem> = {}): BackgroundTaskInboxItem {
	return {
		taskId: 'browser-1',
		role: 'cloud-browser',
		kind: 'needs-user',
		text: 'Sign in',
		wake: true,
		...overrides,
	};
}

describe('BackgroundTaskInbox', () => {
	it('keeps only the latest event per task, in arrival order', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ taskId: 'a', kind: 'needs-user' }));
		inbox.push('t1', item({ taskId: 'b', kind: 'approval-requested', wake: false }));
		inbox.push('t1', item({ taskId: 'a', kind: 'finished' }));

		expect(inbox.drain('t1').map((i) => [i.taskId, i.kind])).toEqual([
			['b', 'approval-requested'],
			['a', 'finished'],
		]);
		expect(inbox.drain('t1')).toEqual([]);
	});

	it('wakes only when an event needs the orchestrator', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ kind: 'needs-user', wake: true }));
		expect(inbox.needsWake('t1')).toBe(true);

		// The user finished the hand-off: nothing needs the orchestrator any more.
		inbox.push('t1', item({ kind: 'user-replied', wake: false }));
		expect(inbox.needsWake('t1')).toBe(false);
		expect(inbox.needsWake('other')).toBe(false);
	});

	it('restores undelivered events without overwriting newer ones', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ taskId: 'a', kind: 'needs-user' }));
		inbox.push('t1', item({ taskId: 'b', kind: 'needs-user' }));
		const drained = inbox.drain('t1');
		inbox.push('t1', item({ taskId: 'a', kind: 'finished' }));

		inbox.restore('t1', drained);

		expect(inbox.drain('t1').map((i) => [i.taskId, i.kind])).toEqual([
			['b', 'needs-user'],
			['a', 'finished'],
		]);
	});

	it("gives a live run only its own turn's events and the ones sent now", () => {
		const onChange = vi.fn();
		const inbox = new BackgroundTaskInbox(onChange);
		inbox.push('t1', { ...item({ taskId: 'mine' }), messageGroupId: 'turn-a' });
		inbox.push('t1', { ...item({ taskId: 'other' }), messageGroupId: 'turn-b' });
		inbox.push('t1', { ...item({ taskId: 'urgent' }), messageGroupId: 'turn-b' });
		inbox.markSendNow('t1', 'urgent');

		const taken = inbox.drainForTurn('t1', 'turn-a');

		expect(taken.map((i) => i.taskId)).toEqual(['mine', 'urgent']);
		expect(inbox.snapshot('t1')).toEqual([{ taskId: 'other', kind: 'needs-user', sendNow: false }]);
		expect(onChange).toHaveBeenCalledWith('t1');
	});

	it('keeps minor events out of a finishing run, but not out of its next step', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', {
			...item({ taskId: 'mine', kind: 'user-replied', wake: false }),
			messageGroupId: 'turn-a',
		});

		expect(inbox.drainForTurn('t1', 'turn-a', { completing: true })).toEqual([]);
		expect(inbox.drainForTurn('t1', 'turn-a').map((i) => i.kind)).toEqual(['user-replied']);
	});

	it('wakes for events the user asked to send now', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ kind: 'user-replied', wake: false }));
		expect(inbox.needsWake('t1')).toBe(false);

		expect(inbox.markSendNow('t1')).toBe(true);
		expect(inbox.needsWake('t1')).toBe(true);
		expect(inbox.markSendNow('empty')).toBe(false);
	});

	it('renders events as one labelled automated message', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ text: 'Live View: https://example.com' }));

		const message = renderInboxMessage(inbox.drain('t1'));

		expect(message).toMatch(/^<background-task-events>\n/);
		expect(message).toContain('not messages from the user');
		expect(message).toContain('kind="needs-user"');
		expect(message).toContain('Live View: https://example.com');
	});
});
