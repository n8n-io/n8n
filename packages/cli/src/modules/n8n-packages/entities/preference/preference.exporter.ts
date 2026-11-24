import { AiPreferenceService, ProjectScopeService } from '@n8n/backend-services';
import type { AiPreferenceDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

import { PreferenceSerializer } from './preference.serializer';
import { projectScopedDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ExportPackageRequest } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';

@Service()
export class PreferenceExporter {
	constructor(
		private readonly preferences: AiPreferenceService,
		private readonly settings: AiPreferenceSettingsService,
		private readonly serializer: PreferenceSerializer,
		private readonly projectScopes: ProjectScopeService,
	) {}

	async export(
		request: ExportPackageRequest,
		writer: PackageWriter,
		projectTargetsById?: Map<string, string>,
	): Promise<ManifestEntry[]> {
		if (!request.includePreferences && !request.preferenceIds?.length) return [];
		if (!this.settings.isEnabled)
			throw new ForbiddenError('Preferences are unavailable on this instance.');
		if (request.canExportPreferences === false)
			throw new ForbiddenError(
				'The API key needs aiPreference:read and aiPreference:list to export Preferences.',
			);
		if (request.includePreferences && !request.projectIds?.length)
			throw new BadRequestError('includePreferences requires projectIds.');
		const rows = new Map<string, AiPreferenceDto>();
		for (const id of request.preferenceIds ?? [])
			rows.set(id, await this.preferences.getById(request.user, id));
		if (request.includePreferences) {
			const allowed = await this.projectScopes.getProjectIds(request.user, [
				'projectAiPreference:list',
				'projectAiPreference:read',
			]);
			for (const projectId of request.projectIds ?? []) {
				if (allowed !== null && !allowed.includes(projectId))
					throw new ForbiddenError('You cannot export Preferences from this project.');
				let offset = 0;
				while (true) {
					const page = await this.preferences.list(request.user, {
						scope: 'project',
						projectId,
						offset,
						limit: 100,
					});
					for (const row of page.data) rows.set(row.id, row);
					offset += page.data.length;
					if (offset >= page.count || page.data.length === 0) break;
				}
			}
		}
		const entries: ManifestEntry[] = [];
		for (const row of rows.values()) {
			const serialized = this.serializer.serialize(row);
			if (request.projectIds?.length && row.projectId && !projectTargetsById?.has(row.projectId))
				throw new BadRequestError(
					'The selected Preference belongs to a project outside the package.',
				);
			entries.push(
				await writeManifestEntry(
					writer,
					'preferences',
					projectScopedDirectory('preferences', row.projectId ?? undefined, projectTargetsById),
					{ id: row.id, name: 'Preference' },
					serialized,
				),
			);
		}
		return entries;
	}
}
