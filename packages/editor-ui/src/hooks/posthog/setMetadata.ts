/**
 * Set metadata on a user, or on all events sent by a user.
 *
 * User: https://posthog.com/docs/integrate/client/js#sending-user-information
 * User events: https://posthog.com/docs/integrate/client/js#super-properties
 */
export function hooksPosthogSetMetadata(
	metadata: Record<string, unknown>,
	target: 'user' | 'events',
) {
	if (!window.posthog) {
		return;
	}

	if (target === 'user') {
		window.posthog.people?.set(metadata);
		return;
	}

	if (target === 'events') {
		window.posthog.register?.(metadata);
		return;
	}

	throw new Error("Arg `target` must be 'user' or 'events'");
}
