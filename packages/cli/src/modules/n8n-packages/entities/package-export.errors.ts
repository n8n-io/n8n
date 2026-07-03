import { UserError } from 'n8n-workflow';

// Only used to pick the audit event's `reason` (access-denied vs entity-not-found).
// The export handler always catches both and rethrows a generic UserError with
// the same message — never let either leak to the caller as-is, or an
// unauthorized caller learns the entity exists.
export class PackageEntityAccessDeniedError extends UserError {}
export class PackageEntityNotFoundError extends UserError {}

/**
 * The one extra unscoped existence check exists purely to pick the right
 * error above for the audit event — the message thrown is identical either
 * way, so it never tells the caller which case occurred.
 */
export async function assertAllRequestedEntitiesFound(
	entityLabel: string,
	requestedIds: string[],
	foundEntities: ReadonlyArray<{ id: string }>,
	existsByIds: (ids: string[]) => Promise<Set<string>>,
): Promise<void> {
	const foundIds = new Set(foundEntities.map(({ id }) => id));
	const missingIds = requestedIds.filter((id) => !foundIds.has(id));

	if (missingIds.length === 0) return;

	const displayedIds = missingIds.slice(0, 20);
	const omittedCount = missingIds.length - displayedIds.length;
	const message = `${missingIds.length} ${entityLabel}(s) not found or not accessible. Export aborted.`;
	const description = `Missing ${entityLabel} IDs: ${displayedIds.join(', ')}${
		omittedCount > 0 ? `, and ${omittedCount} more` : ''
	}`;

	const existingMissingIds = await existsByIds(missingIds);

	if (existingMissingIds.size > 0) {
		throw new PackageEntityAccessDeniedError(message, { description });
	}
	throw new PackageEntityNotFoundError(message, { description });
}
