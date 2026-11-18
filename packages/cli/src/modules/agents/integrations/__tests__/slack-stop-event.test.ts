import { readSlackStopEvent } from '../platforms/slack/slack-stop-event';

const body = (event: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
	type: 'event_callback',
	team_id: 'T1',
	event,
	...extra,
});

describe('readSlackStopEvent', () => {
	it('reads a Stop request', () => {
		expect(
			readSlackStopEvent(
				body({
					type: 'agent_session_stopped',
					channel: 'D1',
					thread_ts: '1782234671.392669',
					user: 'U1',
				}),
			),
		).toEqual({
			platformThreadId: 'slack:D1:1782234671.392669',
			externalUserId: 'U1',
			tenantId: 'T1',
		});
	});

	it('has no workspace when the envelope has none', () => {
		const event = readSlackStopEvent(
			body(
				{ type: 'agent_session_stopped', channel: 'D1', thread_ts: '1.2', user: 'U1' },
				{ team_id: undefined },
			),
		);

		expect(event?.tenantId).toBeUndefined();
	});

	it.each([
		['another event', body({ type: 'message', channel: 'D1', thread_ts: '1.2', user: 'U1' })],
		['a missing user', body({ type: 'agent_session_stopped', channel: 'D1', thread_ts: '1.2' })],
		['a missing thread', body({ type: 'agent_session_stopped', channel: 'D1', user: 'U1' })],
		['a URL check', { type: 'url_verification', challenge: 'x' }],
		['a non-object', 'text'],
		['null', null],
	])('ignores %s', (_name, value) => {
		expect(readSlackStopEvent(value)).toBeUndefined();
	});
});
