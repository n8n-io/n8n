import type { RequestResponseMetadata } from '@utils/agent-execution';

/**
 * Merges metadata from multiple batch requests, preserving conversation history
 * (previousRequests) across items.
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

	return {
		...into,
		previousRequests: [...(into.previousRequests ?? []), ...itemPreviousRequests],
	};
}
