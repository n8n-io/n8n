import {
	AiPreferenceService,
	SharedPreferenceApplyError,
	toSharedPreferenceIssue,
	type SharedPreferenceChange,
	type SharedPreferencePlan,
} from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

import { assertPackageImportApiKeyScopes } from '../../engine/import-gates';
import { countPreferenceStatuses } from '../../engine/import-result';
import { toImportBlockedError } from '../../engine/import-blocked.error';
import { N8nPackageParser } from '../../engine/n8n-package-parser';
import type { PackageReader } from '../../io/package-reader';
import type { BlockingIssue, ResolvedImportRequest } from '../../n8n-packages.types';
import type { PackageManifest } from '../../spec/manifest.schema';

export interface PreferenceImportPlan {
	changes: SharedPreferencePlan;
	issues: BlockingIssue[];
}

@Service()
export class PreferenceImporter {
	constructor(
		private readonly preferences: AiPreferenceService,
		private readonly settings: AiPreferenceSettingsService,
		private readonly parser: N8nPackageParser,
	) {}

	async plan(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		newProjectIds: string[] = [],
	): Promise<PreferenceImportPlan> {
		const deletedIds =
			request.selection?.deletedPreferenceIds ?? request.deletedPreferenceIds ?? [];
		const selectedIds = request.selection?.selectedPreferenceIds;
		if (manifest.preferences === undefined && (deletedIds.length || selectedIds?.length)) {
			throw new BadRequestError('Preference selection requires a Preferences collection.');
		}
		const all = await this.parser.getPreferences(reader);
		const selected = request.selection ? all.filter((item) => selectedIds?.includes(item.id)) : all;
		for (const id of selectedIds ?? []) {
			if (!selected.some((item) => item.id === id))
				throw new BadRequestError('The selected Preference is absent from the package.');
		}
		const changes: SharedPreferenceChange[] = [];
		for (const item of selected) {
			if (
				request.selection &&
				item.sourceProjectId &&
				item.sourceProjectId !== request.selection.selectedProjectId
			) {
				throw new BadRequestError('The selected Preference belongs to another project.');
			}
			changes.push({
				id: item.id,
				scope: item.scope,
				content: item.content,
				...(item.scope === 'project'
					? { projectId: item.sourceProjectId ?? request.projectId }
					: {}),
			});
		}
		for (const id of deletedIds) {
			if (changes.some((change) => change.id === id))
				throw new BadRequestError('A Preference cannot be imported and removed together.');
			let row;
			try {
				row = await this.preferences.getById(request.user, id);
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
				const projectId = request.selection?.selectedProjectId ?? request.projectId;
				changes.push({
					id,
					scope: projectId ? 'project' : 'instance',
					...(projectId ? { projectId } : {}),
				});
				continue;
			}
			if (row.userId || row.project?.type === 'personal')
				throw new BadRequestError('Personal Preferences cannot be removed by a package.');
			const allowedProjects = request.selection
				? [request.selection.selectedProjectId]
				: manifest.projects?.length
					? manifest.projects.map(({ id }) => id)
					: [request.projectId];
			if (row.projectId && !allowedProjects.includes(row.projectId))
				throw new BadRequestError('The removed Preference belongs to another project.');
			changes.push({
				id,
				scope: row.projectId ? 'project' : 'instance',
				...(row.projectId ? { projectId: row.projectId } : {}),
			});
		}
		if (changes.length && !this.settings.isEnabled) {
			return {
				changes: { items: [], issues: [], newProjectIds },
				issues: [
					{
						type: 'preference-conflict',
						kind: 'unavailable',
						message: 'Preferences are unavailable on this instance.',
					},
				],
			};
		}
		const plan = await this.preferences.planSharedChanges(
			request.user,
			changes,
			request.preferenceConflictPolicy,
			newProjectIds,
		);
		this.assertApiKeyScopes(request, plan);
		return {
			changes: plan,
			issues: plan.issues.map((issue) => ({ type: 'preference-conflict', ...issue })),
		};
	}

	async check(request: ResolvedImportRequest, plan: PreferenceImportPlan) {
		if (plan.issues.length) throw toImportBlockedError(plan.issues);
		this.assertAvailable(plan);
		this.assertApiKeyScopes(request, plan.changes);
		try {
			await this.preferences.checkSharedChanges(request.user, plan.changes, request.ctx);
		} catch (error) {
			throw this.blocked(error);
		}
	}

	async apply(request: ResolvedImportRequest, plan: PreferenceImportPlan) {
		if (plan.issues.length) throw toImportBlockedError(plan.issues);
		this.assertAvailable(plan);
		this.assertApiKeyScopes(request, plan.changes);
		try {
			return await this.preferences.applySharedChanges(request.user, plan.changes, request.ctx);
		} catch (error) {
			throw this.blocked(error);
		}
	}

	private assertAvailable(plan: PreferenceImportPlan) {
		if (plan.changes.items.length && !this.settings.isEnabled)
			throw toImportBlockedError([
				{
					type: 'preference-conflict',
					kind: 'unavailable',
					message: 'Preferences are unavailable on this instance.',
				},
			]);
	}

	private assertApiKeyScopes(request: ResolvedImportRequest, plan: SharedPreferencePlan) {
		for (const item of plan.items) {
			assertPackageImportApiKeyScopes(request.apiKeyScopes, [
				`aiPreference:${item.action === 'skip' ? 'read' : item.action}`,
			]);
		}
	}

	private blocked(error: unknown) {
		if (error instanceof SharedPreferenceApplyError) {
			return toImportBlockedError(
				[
					{
						type: 'preference-conflict',
						...toSharedPreferenceIssue(error.cause),
						preferenceId: error.preferenceId,
					},
				],
				{
					preferences: error.completed,
					counts: { preferences: countPreferenceStatuses(error.completed) },
				},
			);
		}
		return toImportBlockedError([
			{ type: 'preference-conflict', ...toSharedPreferenceIssue(error) },
		]);
	}
}
