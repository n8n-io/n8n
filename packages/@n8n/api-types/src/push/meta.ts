/**
 * Optional, additive envelope metadata carried alongside a push message's
 * `type`/`data`. Present on terminal execution events so the client can dedup
 * and distinguish a live delivery from a replay on reconnect.
 *
 * Backward-compatible in both directions: old clients ignore it, and a new
 * client tolerates its absence from an old server.
 */
export type PushMessageMeta = {
	/** Stable id for a single emission, for dedup and delivery telemetry. */
	eventId: string;
	/** Server emit time, ISO-8601. Server clock only — never the client's. */
	ts: string;
	/** `true` when this event was re-delivered on reconnect rather than pushed live. */
	replayed?: boolean;
};
