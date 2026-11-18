/** A Stop request from the Slack agent view, as `agent_session_stopped` reports it. */
export interface SlackStopEvent {
	/** The Chat SDK thread id: `slack:<channel>:<thread_ts>`. */
	platformThreadId: string;
	/** The Slack user who pressed Stop. */
	externalUserId: string;
	/** The workspace. Slack puts it on the envelope, not on the event. */
	tenantId: string | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

/** Reads a Stop request from a verified Slack event body. Returns `undefined` for any other body. */
export function readSlackStopEvent(body: unknown): SlackStopEvent | undefined {
	if (!isRecord(body) || body.type !== 'event_callback' || !isRecord(body.event)) return undefined;
	const { type, channel, thread_ts: threadTs, user } = body.event;
	if (type !== 'agent_session_stopped') return undefined;
	if (typeof channel !== 'string' || typeof threadTs !== 'string' || typeof user !== 'string') {
		return undefined;
	}
	return {
		platformThreadId: `slack:${channel}:${threadTs}`,
		externalUserId: user,
		tenantId: typeof body.team_id === 'string' ? body.team_id : undefined,
	};
}
