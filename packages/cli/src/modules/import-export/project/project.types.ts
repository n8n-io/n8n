export interface ManifestProjectEntry {
	id: string;
	name: string;
	target: string;
}

export interface SerializedProject {
	id: string;
	name: string;
	description?: string;
	icon?: { type: 'emoji' | 'icon'; value: string };
}
