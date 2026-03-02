import type { ManifestFolderEntry } from '../folder/folder.types';

export interface ManifestProjectEntry {
	id: string;
	name: string;
	target: string;
	folders?: ManifestFolderEntry[];
}

export interface SerializedProject {
	id: string;
	name: string;
	description?: string;
	icon?: { type: 'emoji' | 'icon'; value: string };
}
