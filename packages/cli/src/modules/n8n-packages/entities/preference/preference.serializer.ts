import {
	aiPreferenceScopeOf,
	serializedPreferenceSchema,
	type AiPreferenceDto,
	type SerializedPreference,
} from '@n8n/api-types';
import { Service } from '@n8n/di';

import { PackageExportBlockedError } from '../package-export.errors';

@Service()
export class PreferenceSerializer {
	serialize(preference: AiPreferenceDto): SerializedPreference {
		const scope = aiPreferenceScopeOf(preference);
		if (scope === 'user' || preference.project?.type === 'personal') {
			throw new PackageExportBlockedError('Personal Preferences cannot be exported.');
		}

		return serializedPreferenceSchema.parse({
			id: preference.id,
			scope,
			content: preference.content,
		});
	}
}
