import { z } from 'zod';

/**
 * Defensive upper bound on the number of execution ids accepted in a single
 * `resume` handshake. The editor canvas tracks a single in-flight execution,
 * so `awaiting` is 0-or-1 in practice; this cap only guards against a
 * misbehaving or malicious client.
 */
export const RESUME_AWAITING_MAX = 50;

/**
 * Client → server message sent over the (bidirectional) WebSocket push channel
 * right after reconnecting, before consuming live events. It names the
 * executions the client still shows as running so the server can re-deliver any
 * terminal execution events the client missed while disconnected, sourced from
 * the DB.
 *
 * Not used on the SSE transport (unidirectional): there, recovery degrades to
 * the REST reconcile path.
 */
export const resumeMessageSchema = z.object({
	type: z.literal('resume'),
	data: z.object({
		/**
		 * Execution ids the client still shows as running. Derived from the
		 * single tracked execution on the canvas (0-or-1 in practice).
		 */
		awaiting: z.array(z.string().min(1)).max(RESUME_AWAITING_MAX),
	}),
});

export type ResumeMessage = z.infer<typeof resumeMessageSchema>;
