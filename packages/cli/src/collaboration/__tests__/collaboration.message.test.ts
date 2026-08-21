import { isCollaborationMessage } from '@/collaboration/collaboration.message';

describe('isCollaborationMessage', () => {
	it.each([
		'workflowOpened',
		'workflowClosed',
		'writeAccessRequested',
		'writeAccessReleaseRequested',
		'writeAccessHeartbeat',
	])('accepts the collaboration message type "%s"', (type) => {
		expect(isCollaborationMessage({ type, workflowId: 'wf-1' })).toBe(true);
	});

	it.each([
		{ type: 'resume', data: { awaiting: ['e1'] } }, // another consumer's message
		{ type: 'heartbeat' },
		{ type: 'somethingElse' },
		{ workflowId: 'wf-1' }, // no type
		{},
		null,
		undefined,
		'a string',
	])('ignores non-collaboration message %j', (msg) => {
		expect(isCollaborationMessage(msg)).toBe(false);
	});
});
