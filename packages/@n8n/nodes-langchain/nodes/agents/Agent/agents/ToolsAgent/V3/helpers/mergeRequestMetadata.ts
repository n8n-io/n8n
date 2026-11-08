import type { RequestResponseMetadata } from '@utils/agent-execution';

/**
 * Merges metadata from multiple batch requests, preserving conversation history
 * (previousRequests) across items without duplicating untagged legacy history.
 */
export function mergeRequestMetadata(
	into: RequestResponseMetadata,
	from?: RequestResponseMetadata,
): RequestResponseMetadata;
export function mergeRequestMetadata(
	into?: RequestResponseMetadata,
	from?: RequestResponseMetadata,
): RequestResponseMetadata | undefined;
export function mergeRequestMetadata(
	into?: RequestResponseMetadata,
	from?: RequestResponseMetadata,
): RequestResponseMetadata | undefined {
	if (!into) return from;
	if (!from) return into;

	const itemPreviousRequests = from.previousRequests;
	if (!itemPreviousRequests?.length) {
		return into;
	}

	const intoRequests = into.previousRequests ?? [];

	// Resumed legacy executions can carry untagged steps into every item.
	// Deduplicate untagged steps so they are not concatenated multiple times.
	const seenUntagged = new Set(
		intoRequests
			.filter((s) => s.itemIndex === undefined)
			.map((s) => s.action?.toolCallId ?? `${s.action?.tool}:${s.observation}`),
	);

	const newFromRequests = itemPreviousRequests.filter((step) => {
		if (step.itemIndex === undefined) {
			const key = step.action?.toolCallId ?? `${step.action?.tool}:${step.observation}`;
			return !seenUntagged.has(key);
		}
		return true;
	});

	if (!newFromRequests.length) {
		return into;
	}

	return {
		...into,
		previousRequests: [...intoRequests, ...newFromRequests],
	};
}
