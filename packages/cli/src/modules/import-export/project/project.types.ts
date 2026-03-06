import type { EntityEntries, ManifestEntry } from '../import-export.types';

export interface ManifestProjectEntry extends ManifestEntry, EntityEntries {}

export interface SerializedProject {
	id: string;
	name: string;
	description?: string;
	icon?: { type: 'emoji' | 'icon'; value: string };
}
