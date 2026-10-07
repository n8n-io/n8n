import type { BackgroundTaskInboxItem } from '@n8n/instance-ai';

import { BackgroundTaskInbox, renderInboxMessage } from '../background-task-inbox';

function item(overrides: Partial<BackgroundTaskInboxItem> = {}): BackgroundTaskInboxItem {
	return {
		taskId: 'browser-1',
		role: 'cloud-browser',
		kind: 'finished',
		text: 'Finished with outcome "succeeded".',
		wake: true,
		...overrides,
	};
}

describe('BackgroundTaskInbox', () => {
	it('keeps only the latest event per task, in arrival order', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ taskId: 'a', text: 'first' }));
		inbox.push('t1', item({ taskId: 'b' }));
		inbox.push('t1', item({ taskId: 'a', text: 'second' }));

		expect(inbox.drain('t1').map((i) => [i.taskId, i.text])).toEqual([
			['b', 'Finished with outcome "succeeded".'],
			['a', 'second'],
		]);
		expect(inbox.drain('t1')).toEqual([]);
	});

	it('wakes only when an event needs the orchestrator', () => {
		const inbox = new BackgroundTaskInbox();
		// The user stopped the task: they know, so it does not need the orchestrator now.
		inbox.push('t1', item({ wake: false, text: 'The user stopped this task.' }));
		expect(inbox.needsWake('t1')).toBe(false);

		inbox.push('t1', item({ taskId: 'b', wake: true }));
		expect(inbox.needsWake('t1')).toBe(true);
		expect(inbox.needsWake('other')).toBe(false);
	});

	it('restores undelivered events without overwriting newer ones', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ taskId: 'a', text: 'old' }));
		inbox.push('t1', item({ taskId: 'b', text: 'old' }));
		const drained = inbox.drain('t1');
		inbox.push('t1', item({ taskId: 'a', text: 'new' }));

		inbox.restore('t1', drained);

		expect(inbox.drain('t1').map((i) => [i.taskId, i.text])).toEqual([
			['b', 'old'],
			['a', 'new'],
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
		expect(inbox.snapshot('t1')).toEqual([{ taskId: 'other', kind: 'finished', sendNow: false }]);
		expect(onChange).toHaveBeenCalledWith('t1');
	});

	it('keeps minor events out of a finishing run, but not out of its next step', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', {
			...item({ taskId: 'mine', wake: false }),
			messageGroupId: 'turn-a',
		});

		expect(inbox.drainForTurn('t1', 'turn-a', { completing: true })).toEqual([]);
		expect(inbox.drainForTurn('t1', 'turn-a').map((i) => i.taskId)).toEqual(['mine']);
	});

	it('wakes for events the user asked to send now', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ wake: false }));
		expect(inbox.needsWake('t1')).toBe(false);

		expect(inbox.markSendNow('t1')).toBe(true);
		expect(inbox.needsWake('t1')).toBe(true);
		expect(inbox.markSendNow('empty')).toBe(false);
	});

	it('renders events as one labelled automated message', () => {
		const inbox = new BackgroundTaskInbox();
		inbox.push('t1', item({ text: 'Created credential abc.' }));

		const message = renderInboxMessage(inbox.drain('t1'));

		expect(message).toMatch(/^<background-task-events>\n/);
		expect(message).toContain('not messages from the user');
		expect(message).toContain('kind="finished"');
		expect(message).toContain('Created credential abc.');
	});
});
