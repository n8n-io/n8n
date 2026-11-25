import { AiPreferenceService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import type { ExportPackageRequest } from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

/** Keep availability and shared scope selection consistent across previews and writes. */
@Service()
export class PromotionPreferenceService {
	constructor(
		private readonly preferences: AiPreferenceService,
		private readonly settings: AiPreferenceSettingsService,
	) {}

	async exportOptions(
		user: User,
		projectIds: string[],
		includeInstance = false,
		apiKeyScopes?: string[],
	): Promise<Pick<ExportPackageRequest, 'includePreferences' | 'preferenceIds'>> {
		if (!this.settings.isEnabled) return {};
		assertPreferenceReadAccess(apiKeyScopes);
		const preferenceIds: string[] = [];
		if (includeInstance) {
			let offset = 0;
			while (true) {
				const page = await this.preferences.list(user, { scope: 'instance', offset, limit: 100 });
				preferenceIds.push(...page.data.map(({ id }) => id));
				offset += page.data.length;
				if (offset >= page.count || page.data.length === 0) break;
			}
		}
		return {
			...(projectIds.length ? { includePreferences: true } : {}),
			...(includeInstance ? { preferenceIds } : {}),
		};
	}
}

/** An absent collection does not authorize removal. Project selections exclude instance rows. */
export function selectPromotionPreferences(
	branch: PackageManifest,
	instance: PackageManifest,
	projectId?: string,
	requestedIds?: readonly string[],
) {
	const scoped = (manifest: PackageManifest) => {
		const target = manifest.projects?.find(({ id }) => id === projectId)?.target;
		return (manifest.preferences ?? []).filter((entry) => {
			if (projectId !== undefined) return target && entry.target.startsWith(`${target}/`);
			const owner = manifest.projects?.find((project) =>
				entry.target.startsWith(`${project.target}/`),
			);
			return !owner || branch.projects?.some(({ id }) => id === owner.id);
		});
	};
	if (branch.preferences === undefined) {
		if (requestedIds?.length)
			throw new BadRequestError('The reviewed Preferences collection is unavailable.');
		return { selectedPreferenceIds: [], deletedPreferenceIds: [] };
	}
	const sourceIds = new Set(scoped(branch).map(({ id }) => id));
	const localIds = new Set(scoped(instance).map(({ id }) => id));
	const ids = requestedIds ?? [...new Set([...sourceIds, ...localIds])];
	if (ids.some((id) => !sourceIds.has(id) && !localIds.has(id)))
		throw new BadRequestError('The selected Preference is outside the reviewed scope.');
	// A move to another scope is a conflict for the importer, never an inferred removal.
	const allSourceIds = new Set(branch.preferences.map(({ id }) => id));
	if (ids.some((id) => !sourceIds.has(id) && allSourceIds.has(id)))
		throw new BadRequestError('A selected Preference belongs to another scope on the branch.');
	return {
		selectedPreferenceIds: ids.filter((id) => sourceIds.has(id)),
		deletedPreferenceIds: ids.filter((id) => !sourceIds.has(id)),
	};
}

export function assertPreferenceReadAccess(apiKeyScopes?: string[]) {
	if (
		apiKeyScopes &&
		!['aiPreference:read', 'aiPreference:list'].every((scope) => apiKeyScopes.includes(scope))
	)
		throw new ForbiddenError(
			'The API key needs aiPreference:read and aiPreference:list for Preferences.',
		);
}
