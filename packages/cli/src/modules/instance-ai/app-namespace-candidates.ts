import { appNamespaceSchema } from '@n8n/api-types';

const MAX_NUMBERED_NAMESPACES = 20;

/**
 * The namespaces to try, in order, for an app that the Assistant creates:
 * the proposed one, then the same name with `-2`, `-3` and so on.
 * Each name is cut so that it stays within `maxLength`. Cloud instances
 * add their name to app hosts, so their limit is lower than the schema limit.
 */
export function appNamespaceCandidates(
	namespace: string,
	maxLength = appNamespaceSchema.maxLength ?? namespace.length,
): string[] {
	const candidates = [namespace.slice(0, maxLength).replace(/-+$/, '')];
	for (let suffixNumber = 2; suffixNumber <= MAX_NUMBERED_NAMESPACES + 1; suffixNumber++) {
		const suffix = `-${suffixNumber}`;
		const base = namespace.slice(0, maxLength - suffix.length).replace(/-+$/, '');
		candidates.push(`${base}${suffix}`);
	}
	return candidates;
}
