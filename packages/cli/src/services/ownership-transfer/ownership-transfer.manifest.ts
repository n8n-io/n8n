import manifest from './ownership-transfer.manifest.json';

/**
 * Typed view over `ownership-transfer.manifest.json` — the single source of
 * truth for how project-owned entities are handled when a project's resources
 * change owner (user deletion with transfer, LDAP reset).
 *
 * Each entry pins the entity to its declaring file via `path`, so the lint
 * rule can reject a same-named entity declared elsewhere, and the guard test
 * can detect stale entries after a file is moved or deleted.
 *
 * The JSON is also consumed by the eslint configs of `@n8n/db` and `cli` to
 * feed the `n8n-local-rules/project-owned-entity-transfer` rule, and enforced
 * against the actual TypeORM metadata by
 * `__tests__/ownership-transfer.manifest.test.ts`, so that adding a new
 * project-owned resource forces an explicit decision instead of silently
 * dropping user data, as previously happened with data tables.
 */

export interface TransferredProjectResource {
	/** Entity class name */
	name: string;
	/** Repo-relative path of the file declaring the entity */
	path: string;
}

export interface NotTransferredProjectResource extends TransferredProjectResource {
	/** Why this conscious decision was made — reviewed in the PR that adds it */
	reason: string;
}

/** Entities transferred by {@link OwnershipTransferService.transferAllResources}. */
export const TRANSFERRED_PROJECT_RESOURCES: readonly TransferredProjectResource[] =
	manifest.transferred;

/** Entities intentionally NOT transferred, each with the reason why. */
export const NOT_TRANSFERRED_PROJECT_RESOURCES: readonly NotTransferredProjectResource[] =
	manifest.notTransferred;
