import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { pickVariableForProject } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { variableBlockingFailures } from './variable-missing-mode';
import { computeVariableLimitFailure, createFailure } from './variable.types';
import type {
	VariableApplyResult,
	VariableCreation,
	VariableImportPlan,
	VariableImportRequest,
	VariableResolutionFailure,
} from './variable.types';
import { VariableMissingMode } from '../../n8n-packages.types';
import type { ImportContext } from '../../n8n-packages.types';

@Service()
export class VariableImporter {
	constructor(
		private readonly variablesService: VariablesService,
		private readonly licenseState: LicenseState,
	) {}

	/**
	 * Resolves the package's variable requirements against the target project
	 * (then global), mirroring runtime `$vars` precedence. Under `create-stub` it
	 * additionally derives the stubs to create and preflights permission, license,
	 * and (unless `checkQuota` is disabled) the instance variable quota — throwing
	 * a `ForbiddenError` for permission/license failures before any writes.
	 */
	async plan(
		context: ImportContext,
		request: VariableImportRequest,
		options: { projectPendingCreation?: boolean; checkQuota?: boolean } = {},
	): Promise<VariableImportPlan> {
		const requirements = request.requirements ?? [];
		if (requirements.length === 0) return { matched: [], missing: [], creations: [] };

		const allVariables = await this.variablesService.getAllCached();
		const variablesByKey = new Map<string, typeof allVariables>();
		for (const variable of allVariables) {
			const bucket = variablesByKey.get(variable.key);
			if (bucket) bucket.push(variable);
			else variablesByKey.set(variable.key, [variable]);
		}

		const matched: string[] = [];
		const missing: VariableResolutionFailure[] = [];
		const creations: VariableCreation[] = [];
		const createStub = request.missingMode === VariableMissingMode.CreateStub;

		for (const requirement of requirements) {
			const picked = pickVariableForProject(
				variablesByKey.get(requirement.name) ?? [],
				requirement.name,
				context.projectId,
			);
			if (picked) {
				matched.push(requirement.name);
				continue;
			}
			missing.push(createFailure(requirement));
			if (createStub) {
				creations.push({
					name: requirement.name,
					...(requirement.globalPlacement ? {} : { projectId: context.projectId }),
					usedByWorkflows: [...new Set(requirement.usedByWorkflows)].sort(),
				});
			}
		}

		if (creations.length > 0) {
			await this.assertCanCreate(context, creations, options.projectPendingCreation ?? false);
		}

		const limitFailure =
			(options.checkQuota ?? true)
				? computeVariableLimitFailure(
						creations,
						allVariables.length,
						this.licenseState.getMaxVariables(),
					)
				: undefined;

		return { matched, missing, creations, ...(limitFailure ? { limitFailure } : {}) };
	}

	/** Classifies which unresolved requirements block the import under the chosen missing mode. */
	blockingFailures(
		request: VariableImportRequest,
		plan: VariableImportPlan,
	): VariableResolutionFailure[] {
		return variableBlockingFailures(request.missingMode, plan);
	}

	/**
	 * Creates the planned stubs with empty values. Re-checks the exact destination
	 * against a fresh cache before each create so a variable already created by an
	 * earlier scope of the same import (or an external writer) is skipped rather
	 * than duplicated. `VariablesService.create` re-enforces permission, license,
	 * quota, and uniqueness and refreshes the cache, which is what makes the
	 * cross-scope dedupe work.
	 */
	async apply(context: ImportContext, plan: VariableImportPlan): Promise<VariableApplyResult> {
		const stubbed: string[] = [];
		const skippedExisting: string[] = [];
		let createdCount = 0;

		for (const creation of plan.creations) {
			if (await this.variableExistsAtDestination(creation)) {
				skippedExisting.push(creation.name);
				continue;
			}

			try {
				await this.variablesService.create(context.user, {
					key: creation.name,
					type: 'string',
					value: '',
					...(creation.projectId ? { projectId: creation.projectId } : {}),
				});
				stubbed.push(creation.name);
				createdCount += 1;
			} catch (error) {
				// `VariablesService.create` throws the same `VariableCountLimitReachedError` for two
				// unrelated failures: the key already exists at this destination, or the instance quota
				// is full. Re-checking the destination tells them apart — a row there means a concurrent
				// writer beat us to it and the variable now exists as needed (skip); no row means the
				// quota preflight raced and the overrun is real (rethrow). Other errors propagate as-is.
				if (
					error instanceof VariableCountLimitReachedError &&
					(await this.variableExistsAtDestination(creation))
				) {
					skippedExisting.push(creation.name);
					continue;
				}
				throw error;
			}
		}

		return {
			stubbed: [...new Set(stubbed)],
			skippedExisting: [...new Set(skippedExisting)],
			createdCount,
		};
	}

	/**
	 * Whether a row already exists at the creation's exact destination. Deliberately
	 * not `pickVariableForProject`: runtime precedence would wrongly report a planned
	 * project-scoped creation as occupied when a same-key global was just created by
	 * an earlier scope of the same import.
	 */
	private async variableExistsAtDestination(creation: VariableCreation): Promise<boolean> {
		const allVariables = await this.variablesService.getAllCached();
		return allVariables.some((variable) => {
			if (variable.key !== creation.name) return false;
			return creation.projectId ? variable.project?.id === creation.projectId : !variable.project;
		});
	}

	private async assertCanCreate(
		context: ImportContext,
		creations: VariableCreation[],
		projectPendingCreation: boolean,
	): Promise<void> {
		const needsGlobal = creations.some((creation) => !creation.projectId);
		const needsProject = creations.some((creation) => creation.projectId);

		if (needsGlobal && !hasGlobalScope(context.user, 'variable:create')) {
			throw new ForbiddenError('You are not allowed to create global variables');
		}

		// A project being created by this same import does not exist yet, so the scope lookup would
		// always fail. The importing user becomes its admin on creation and `VariablesService.create`
		// re-checks at apply time.
		if (needsProject && !projectPendingCreation) {
			const allowed = await userHasScopes(context.user, ['projectVariable:create'], false, {
				projectId: context.projectId,
			});
			if (!allowed) {
				throw new ForbiddenError('You are not allowed to create variables in this project');
			}
		}

		if (!this.licenseState.isVariablesLicensed()) {
			throw new ForbiddenError(
				'Your license does not allow variables. Importing a package that creates variables requires a license that supports variables.',
			);
		}
	}
}
