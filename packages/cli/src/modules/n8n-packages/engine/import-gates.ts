import type { LicenseState } from '@n8n/backend-common';
import type { Scope } from '@n8n/permissions';

import { ForbiddenError } from '@n8n/errors';

import { plannedCredentialUpdates } from '../entities/credential/credential-conflict-policy';
import type { CredentialImportPlan } from '../entities/credential/credential.types';
import type { DataTableImportPlan } from '../entities/data-table/data-table.types';
import type { FolderImportPlan } from '../entities/folder/folder-import.types';
import type { ProjectPlanItem } from '../entities/project/project-import.types';
import type { SkillImportPlan } from '../entities/skill/skill-import.types';
import type { TagImportPlan } from '../entities/tag/tag.types';
import type {
	WorkflowImportPlan,
	WorkflowPlanItem,
} from '../entities/workflow/workflow-import.types';
import type { CredentialConflictPolicy } from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';

export function packageImportScopes(manifest: PackageManifest): Scope[] {
	const scopes: Scope[] = [];
	if (manifest.workflows?.length || (!manifest.agents?.length && !manifest.projects?.length)) {
		scopes.push('workflow:import');
	}
	if (manifest.agents?.length) scopes.push('agent:import');
	return scopes;
}

export function assertPackageImportApiKeyScopes(
	apiKeyScopes: string[] | undefined,
	required: string[],
): void {
	if (apiKeyScopes === undefined) return;
	for (const scope of required) {
		if (!apiKeyScopes.includes(scope)) {
			throw new ForbiddenError('Forbidden');
		}
	}
}

/**
 * Gated on what the import will write, not on what the package requires: a package whose variables
 * all resolve writes nothing, so it needs neither the licence nor a scope. Mirrors the variables UI.
 */
export function assertVariableWritesAllowed(options: {
	licenseState: LicenseState;
	apiKeyScopes: string[] | undefined;
	hasCreations: boolean;
	hasOverwrites: boolean;
}): void {
	const { licenseState, apiKeyScopes, hasCreations, hasOverwrites } = options;
	if (!hasCreations && !hasOverwrites) return;

	if (!licenseState.isVariablesLicensed()) {
		throw new ForbiddenError(
			'Your license does not allow variables. Importing a package that writes variables requires a license that supports variables.',
		);
	}
	if (hasCreations) assertPackageImportApiKeyScopes(apiKeyScopes, ['variable:create']);
	if (hasOverwrites) assertPackageImportApiKeyScopes(apiKeyScopes, ['variable:update']);
}

/**
 * A project that the import keeps as it is needs no project scope, even when the import writes
 * workflows into it.
 */
export function assertProjectWritesAllowed(
	apiKeyScopes: string[] | undefined,
	items: Array<Pick<ProjectPlanItem, 'action'>>,
): void {
	if (items.some((item) => item.action === 'create')) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['project:create']);
	}
	if (items.some((item) => item.action === 'update')) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['project:update']);
	}
}

/**
 * A workflow can go into a folder that already exists without the folders licence, as elsewhere
 * in n8n. Only creating, moving or renaming a folder needs the licence and a folder scope.
 */
export function assertFolderWritesAllowed(
	licenseState: LicenseState,
	apiKeyScopes: string[] | undefined,
	folderPlans: Array<Pick<FolderImportPlan, 'items'>>,
): void {
	const items = folderPlans.flatMap((plan) => plan.items);
	const hasCreations = items.some((item) => item.action === 'create');
	const hasUpdates = items.some((item) => item.action === 'update');
	if (!hasCreations && !hasUpdates) return;

	if (!licenseState.isLicensed('feat:folders')) {
		throw new ForbiddenError(
			'Your license does not allow folders. Importing a package that creates or changes folders requires a license that supports folders.',
		);
	}
	if (hasCreations) assertPackageImportApiKeyScopes(apiKeyScopes, ['folder:create']);
	if (hasUpdates) assertPackageImportApiKeyScopes(apiKeyScopes, ['folder:update']);
}

/**
 * Plan-derived: requires a scope only when a plan creates or changes a table. Project packages
 * have no pre-plan create gate, so this gate also covers them.
 */
export function assertDataTableWritesAllowed(
	apiKeyScopes: string[] | undefined,
	dataTablePlans: DataTableImportPlan[],
): void {
	if (dataTablePlans.some((plan) => plan.creations.length > 0)) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['dataTable:create']);
	}
	if (dataTablePlans.some((plan) => plan.updates.length + plan.columnAlignments.length > 0)) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['dataTable:update']);
	}
}

/**
 * Plan-derived: a project or instance skill can change other Agents, so its write needs the
 * matching API-key scope.
 */
export function assertSharedSkillWritesAllowed(
	apiKeyScopes: string[] | undefined,
	skillPlans: Array<Pick<SkillImportPlan, 'shared'>>,
): void {
	assertPackageImportApiKeyScopes(apiKeyScopes, requiredSharedSkillScopes(skillPlans));
}

export function requiredSharedSkillScopes(
	skillPlans: Array<Pick<SkillImportPlan, 'shared'>>,
): Scope[] {
	const writes = skillPlans.flatMap((plan) => plan.shared);
	const scopes: Scope[] = [];
	if (writes.some(({ base }) => !base)) scopes.push('skill:create');
	if (writes.some(({ base }) => base)) scopes.push('skill:update');
	return scopes;
}

/**
 * Plan-derived: requires the scope only when the import writes a matched credential. `fail`
 * never writes, so it needs no scope.
 */
export function assertCredentialUpdatesAllowed(
	apiKeyScopes: string[] | undefined,
	policy: CredentialConflictPolicy,
	credentialPlans: Array<Pick<CredentialImportPlan, 'updates'>>,
): void {
	if (plannedCredentialUpdates(policy, credentialPlans).size > 0) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['credential:update']);
	}
}

/**
 * Plan-derived: a tag must never block an import that would not write it
 * (skipped consumers, disabled tags, dropped conflicts), so the assert looks
 * at what the plans actually create, rename, or reconcile.
 */
export function assertTagWritesAllowed(
	apiKeyScopes: string[] | undefined,
	tagPlans: TagImportPlan[],
): void {
	if (tagPlans.some((plan) => plan.creations.length > 0)) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['tag:create']);
	}
	if (tagPlans.some((plan) => plan.renames.length > 0 || plan.reconciles.length > 0)) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['tag:update']);
	}
}

/**
 * Archiving or unarchiving a matched workflow needs the same scope as deleting one. Checked
 * against the plan, so a package that changes no archived state needs no extra scope.
 */
export function assertArchiveTransitionsAllowed(
	apiKeyScopes: string[] | undefined,
	workflowPlans: WorkflowImportPlan[],
): void {
	const hasTransitions = workflowPlans.some((plan) =>
		plan.items.some((item) => item.action === 'update' && item.archiveTransition !== null),
	);
	if (hasTransitions) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['workflow:delete']);
	}
}

/**
 * Plan-derived, like the Agent publish scopes: a planned publish needs `workflow:activate` and a
 * planned unpublish needs `workflow:deactivate`, as on the direct publish routes. Archiving needs
 * only `workflow:delete` (see {@link assertArchiveTransitionsAllowed}), as on the archive route.
 */
export function assertWorkflowPublishingAllowed(
	apiKeyScopes: string[] | undefined,
	workflowPlan: Pick<WorkflowImportPlan, 'items'>,
): void {
	assertPackageImportApiKeyScopes(
		apiKeyScopes,
		requiredWorkflowPublishingScopes(workflowPlan.items),
	);
}

export function requiredWorkflowPublishingScopes(items: WorkflowPlanItem[]): Scope[] {
	const actions = new Set(items.map((item) => item.publishingAction));
	const scopes: Scope[] = [];
	if (actions.has('publish')) scopes.push('workflow:activate');
	if (actions.has('unpublish')) scopes.push('workflow:deactivate');
	return scopes;
}
