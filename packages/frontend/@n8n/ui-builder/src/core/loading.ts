import { computed, reactive } from 'vue';
import type { ComputedRef } from 'vue';

/**
 * Which actions are in flight.
 *
 * Not part of app state, deliberately. The whole state is POSTed on every
 * action, so flags living in it would ride along as noise, with one of them
 * always true for the very request carrying it, and a workflow could write
 * something only the client can know. So the runtime keeps this beside state
 * and exposes it to expressions as `$loading`.
 *
 * Counted rather than flagged: two calls to the same action overlapping would
 * otherwise have the first response clear the second's flag.
 */
export interface LoadingTracker {
	/** Plain booleans for the expression scope, plus `$any`. */
	flags: ComputedRef<Record<string, boolean>>;
	begin: (key: string) => void;
	end: (key: string) => void;
}

/**
 * An action has no name of its own, so it is keyed by the last path segment of
 * its URL: `…/webhook/saveOrder` gives `saveOrder`. That is the same string the
 * builder's Add-trigger button generates and the action dropdown shows, so what
 * an author writes in an expression is what they picked from the list.
 */
export function actionKey(url: string): string {
	const segments = url.split('?')[0].split('/').filter(Boolean);
	return segments[segments.length - 1] ?? url;
}

export function createLoadingTracker(): LoadingTracker {
	const counts = reactive<Record<string, number>>({});

	const flags = computed(() => {
		const out: Record<string, boolean> = {};
		let any = false;

		for (const [key, count] of Object.entries(counts)) {
			out[key] = count > 0;
			if (count > 0) any = true;
		}

		out.$any = any;
		return out;
	});

	return {
		flags,
		begin: (key) => {
			counts[key] = (counts[key] ?? 0) + 1;
		},
		end: (key) => {
			counts[key] = Math.max(0, (counts[key] ?? 1) - 1);
		},
	};
}
