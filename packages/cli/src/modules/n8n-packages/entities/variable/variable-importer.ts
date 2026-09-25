import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { pickVariableForProject } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import {
	variableBlockingFailures,
	variableMissingModeCreates,
	variableMissingModeUsesPackageValue,
} from './variable-missing-mode';
import {
	computeVariableLimitFailure,
	createFailure,
	dedupeCreationsByDestination,
	destinationKey,
} from './variable.types';
import type {
	VariableApplyResult,
	VariableConflict,
	VariableCreation,
	VariableImportPlan,
	VariableImportRequest,
	VariableLimitFailure,
	VariableOverwrite,
	VariableResolutionFailure,
} from './variable.types';
import { VariableConflictPolicy } from '../../n8n-packages.types';
import type { ImportContext } from '../../n8n-packages.types';

@Service()
export class VariableImporter {
	constructor(private readonly variablesService: VariablesService) {}

	/** Resolves requirements against the target project then global, mirroring runtime `$vars` precedence. */
	async plan(context: ImportContext, request: VariableImportRequest): Promise<VariableImportPlan> {
		const requirements = request.requirements ?? [];
		if (requirements.length === 0) {
			return { matched: [], missing: [], creations: [], conflicts: [], overwrites: [] };
		}

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
		const conflicts: VariableConflict[] = [];
		const overwrites: VariableOverwrite[] = [];
		const createsMissing = variableMissingModeCreates(request.missingMode);
		const usesPackageValue = variableMissingModeUsesPackageValue(request.missingMode);
		const comparesValues = request.conflictPolicy !== VariableConflictPolicy.KeepExisting;
		const overwritesConflicts = request.conflictPolicy === VariableConflictPolicy.Overwrite;

		for (const requirement of requirements) {
			const picked = pickVariableForProject(
				variablesByKey.get(requirement.name) ?? [],
				requirement.name,
				context.projectId,
			);
			if (picked) {
				matched.push(requirement.name);

				const packageValue = requirement.packageValue;
				// An empty bundled value is nothing to write, the same way a creation treats it as a stub.
				if (!comparesValues || !packageValue || packageValue === picked.value) {
					continue;
				}

				const scope = picked.project ? { projectId: picked.project.id } : {};
				const usedByWorkflows = [...new Set(requirement.usedByWorkflows)].sort();
				conflicts.push({ name: requirement.name, ...scope, usedByWorkflows });
				if (overwritesConflicts) {
					overwrites.push({
						variableId: picked.id,
						name: requirement.name,
						...scope,
						value: packageValue,
						usedByWorkflows,
					});
				}
				continue;
			}
			missing.push(createFailure(requirement));
			if (createsMissing) {
				const value = usesPackageValue ? requirement.packageValue : undefined;
				creations.push({
					name: requirement.name,
					...(requirement.globalPlacement ? {} : { projectId: context.projectId }),
					...(value !== undefined ? { value } : {}),
					usedByWorkflows: [...new Set(requirement.usedByWorkflows)].sort(),
				});
			}
		}

		return { matched, missing, creations, conflicts, overwrites };
	}

	/** Deduplicates by destination first: one global variable planned by several scopes is one new row. */
	async quotaFailure(creations: VariableCreation[]): Promise<VariableLimitFailure | undefined> {
		if (creations.length === 0) return undefined;

		return computeVariableLimitFailure(
			dedupeCreationsByDestination(creations),
			await this.variablesService.getRemainingVariableQuota(),
		);
	}

	blockingFailures(
		request: VariableImportRequest,
		plan: VariableImportPlan,
	): VariableResolutionFailure[] {
		return variableBlockingFailures(request.missingMode, plan);
	}

	blockingConflicts(request: VariableImportRequest, plan: VariableImportPlan): VariableConflict[] {
		return request.conflictPolicy === VariableConflictPolicy.Fail ? plan.conflicts : [];
	}

	/**
	 * Re-checks the destination against a fresh cache before each create, so a variable an earlier
	 * scope of this import already created is skipped rather than duplicated. `VariablesService.create`
	 * refreshes that cache, which is what makes the cross-scope dedupe work.
	 */
	async apply(context: ImportContext, plan: VariableImportPlan): Promise<VariableApplyResult> {
		const created: string[] = [];
		const stubbed: string[] = [];
		const skippedExisting: string[] = [];

		for (const creation of plan.creations) {
			if (await this.variableExistsAtDestination(creation)) {
				skippedExisting.push(creation.name);
				continue;
			}

			try {
				await this.variablesService.create(context.user, {
					key: creation.name,
					type: 'string',
					value: creation.value ?? '',
					...(creation.projectId ? { projectId: creation.projectId } : {}),
				});
				// A bundled-but-empty value still leaves the user something to fill in, so it is a stub.
				if (creation.value) {
					created.push(creation.name);
				} else {
					stubbed.push(creation.name);
				}
			} catch (error) {
				// One error type covers both "key taken here" and "quota full" (LIGO-880), so re-check
				// the destination: a row means a concurrent writer won the race, no row means a real overrun.
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

		const updated: string[] = [];
		for (const overwrite of plan.overwrites) {
			const current = await this.variablesService.getCached(overwrite.variableId);
			// Nothing to write if another writer deleted the row, or an earlier scope already applied it.
			if (!current || current.value === overwrite.value) continue;

			await this.variablesService.update(context.user, overwrite.variableId, {
				value: overwrite.value,
			});
			updated.push(overwrite.name);
		}

		return {
			created: [...new Set(created)],
			stubbed: [...new Set(stubbed)],
			skippedExisting: [...new Set(skippedExisting)],
			updated: [...new Set(updated)],
		};
	}

	private async variableExistsAtDestination(creation: VariableCreation): Promise<boolean> {
		const destination = destinationKey(creation);
		const allVariables = await this.variablesService.getAllCached();
		return allVariables.some(
			(variable) =>
				destinationKey({ name: variable.key, projectId: variable.project?.id }) === destination,
		);
	}

	private targetScopes(targets: Array<{ projectId?: string }>, skipProjectId?: string) {
		const projectIds = new Set<string>();
		for (const { projectId } of targets) {
			if (projectId && projectId !== skipProjectId) projectIds.add(projectId);
		}

		return {
			touchesGlobal: targets.some(({ projectId }) => !projectId),
			projectIds,
		};
	}

	async assertCanCreate(
		context: ImportContext,
		creations: VariableCreation[],
		projectPendingCreation: boolean,
	): Promise<void> {
		// A project this import is about to create has no scopes to look up yet; the user becomes its
		// admin on creation, and `VariablesService.create` re-checks at apply time.
		const { touchesGlobal, projectIds } = this.targetScopes(
			creations,
			projectPendingCreation ? context.projectId : undefined,
		);

		if (touchesGlobal && !hasGlobalScope(context.user, 'variable:create')) {
			throw new ForbiddenError('You are not allowed to create global variables');
		}

		for (const projectId of projectIds) {
			const projectVariableCreationAllowed = await userHasScopes(
				context.user,
				['projectVariable:create'],
				false,
				{
					projectId,
				},
			);
			if (!projectVariableCreationAllowed) {
				throw new ForbiddenError('You are not allowed to create variables in this project');
			}
		}
	}

	async assertCanUpdate(context: ImportContext, overwrites: VariableOverwrite[]): Promise<void> {
		const { touchesGlobal, projectIds } = this.targetScopes(overwrites);

		if (touchesGlobal && !hasGlobalScope(context.user, 'variable:update')) {
			throw new ForbiddenError('You are not allowed to update global variables');
		}

		for (const projectId of projectIds) {
			const projectVariableUpdateAllowed = await userHasScopes(
				context.user,
				['projectVariable:update'],
				false,
				{
					projectId,
				},
			);
			if (!projectVariableUpdateAllowed) {
				throw new ForbiddenError('You are not allowed to update variables in this project');
			}
		}
	}
}
