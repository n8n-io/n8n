import { appNamespaceSchema } from '@n8n/api-types';

/** How many numbered names to try after the proposed one. */
const MAX_NUMBERED_NAMESPACES = 20;

/**
 * The namespaces to try, in order, for an app that the Assistant creates:
 * the proposed one, then the same name with `-2`, `-3` and so on.
 * The base is cut so that each name stays within the namespace length limit.
 */
export function appNamespaceCandidates(namespace: string): string[] {
	const maxLength = appNamespaceSchema.maxLength ?? namespace.length;
	const candidates = [namespace];
	for (let suffixNumber = 2; suffixNumber <= MAX_NUMBERED_NAMESPACES + 1; suffixNumber++) {
		const suffix = `-${suffixNumber}`;
		const base = namespace.slice(0, maxLength - suffix.length).replace(/-+$/, '');
		candidates.push(`${base}${suffix}`);
	}
	return candidates;
}
