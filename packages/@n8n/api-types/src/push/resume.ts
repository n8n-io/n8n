import { z } from 'zod';

/**
 * Client → server message sent on WebSocket reconnect to request replay of
 * terminal execution events (e.g. `executionFinished`) that may have been
 * dropped while the client was disconnected.
 *
 * `awaiting` lists the execution ids the client still shows as running. The
 * canvas tracks a single execution, so this is 0 or 1 id in practice. The
 * server reads execution truth from the database for each id, re-delivers the
 * terminal event (with `meta.replayed = true`) for any that already finished,
 * then replies with a `resumeComplete` message.
 */
export const resumeMessageSchema = z.object({
	type: z.literal('resume'),
	data: z.object({
		awaiting: z.array(z.string()),
	}),
});

export type ResumeMessage = z.infer<typeof resumeMessageSchema>;

export const createResumeMessage = (awaiting: string[]): ResumeMessage => ({
	type: 'resume',
	data: { awaiting },
});

/**
 * Server → client message sent once the server has replayed any missed
 * terminal events for a `resume` request. Signals that reconnect catch-up is
 * complete. Carries no payload; `data` is an empty object to keep every push
 * message envelope shaped as `{ type, data }`.
 */
export type ResumeComplete = {
	type: 'resumeComplete';
	data: {};
};
