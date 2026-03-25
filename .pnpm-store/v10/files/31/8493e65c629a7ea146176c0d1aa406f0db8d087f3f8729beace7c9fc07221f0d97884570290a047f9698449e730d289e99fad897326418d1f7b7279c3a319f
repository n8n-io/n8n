import type { Sampled, Session, SessionOptions } from '../types';
/**
 * Get the sampled status for a session based on sample rates & current sampled status.
 */
export declare function getSessionSampleType(sessionSampleRate: number, allowBuffering: boolean): Sampled;
/**
 * Create a new session, which in its current implementation is a Sentry event
 * that all replays will be saved to as attachments. Currently, we only expect
 * one of these Sentry events per "replay session".
 */
export declare function createSession({ sessionSampleRate, allowBuffering, stickySession }: SessionOptions, { previousSessionId }?: {
    previousSessionId?: string;
}): Session;
//# sourceMappingURL=createSession.d.ts.map