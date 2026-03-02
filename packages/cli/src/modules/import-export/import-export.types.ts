import type { User } from '@n8n/db';

import type { ManifestProjectEntry } from './project/project.types';

export type { ManifestProjectEntry } from './project/project.types';
export type { SerializedProject } from './project/project.types';

export interface PackageManifest {
	formatVersion: string;
	exportedAt: string;
	n8nVersion: string;
	source: string;
	projects: ManifestProjectEntry[];
}

export interface ExportContext {
	user: User;
	projectIds: string[];
}
