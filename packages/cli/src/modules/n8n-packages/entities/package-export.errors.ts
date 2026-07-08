import { UserError } from 'n8n-workflow';

/** A requested entity exists but the caller has no access to it. */
export class PackageEntityAccessDeniedError extends UserError {}

/** A requested entity does not exist at all. */
export class PackageEntityNotFoundError extends UserError {}

/**
 * Throws when the caller cannot access every requested entity, distinguishing
 * whether each missing one is genuinely deleted or the caller just has no
 * access to it.
 *
 * `accessibleEntities` is what a permission-scoped query returned; any requested
 * id missing from it is re-checked by `findExistingIdsWithoutAccessCheck` — a row
 * that still comes back means the caller lacks access, otherwise it is deleted.
 */
export async function assertEveryRequestedEntityAccessible(
	entityType: string,
	requestedIds: string[],
	accessibleEntities: ReadonlyArray<{ id: string }>,
	findExistingIdsWithoutAccessCheck: (ids: string[]) => Promise<Set<string>>,
): Promise<void> {
	const accessibleIds = new Set(accessibleEntities.map(({ id }) => id));
	const missingIds = requestedIds.filter((id) => !accessibleIds.has(id));

	if (missingIds.length === 0) return;

	const displayedIds = missingIds.slice(0, 20);
	const omittedCount = missingIds.length - displayedIds.length;
	const message = `${missingIds.length} ${entityType}(s) not found or not accessible. Export aborted.`;
	const description = `Missing ${entityType} IDs: ${displayedIds.join(', ')}${
		omittedCount > 0 ? `, and ${omittedCount} more` : ''
	}`;

	const existingMissingIds = await findExistingIdsWithoutAccessCheck(missingIds);

	if (existingMissingIds.size > 0) {
		throw new PackageEntityAccessDeniedError(message, { description });
	}
	throw new PackageEntityNotFoundError(message, { description });
}
