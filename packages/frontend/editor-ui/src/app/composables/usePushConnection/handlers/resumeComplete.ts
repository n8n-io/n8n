import type { ResumeComplete } from '@n8n/api-types';

/**
 * Handles the 'resumeComplete' message, which the server sends after replaying
 * any terminal events missed during a disconnect (in response to the reconnect
 * `resume` handshake).
 *
 * No state change is required here: replayed terminal events (e.g.
 * `executionFinished` carrying `meta.replayed`) are applied idempotently by
 * `executionId` as they arrive, so the stranded spinner is already cleared by
 * the time this arrives. The message only marks the end of the catch-up window;
 * handling it explicitly keeps the completion signal a known type rather than a
 * silently dropped one, and leaves a seam for future reconnect diagnostics.
 */
export function resumeComplete(_event: ResumeComplete) {}
