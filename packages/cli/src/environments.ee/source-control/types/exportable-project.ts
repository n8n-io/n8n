import type { RemoteResourceOwner } from './resource-owner';

export interface ExportableProject {
	id: string;
	name: string;
	icon: { type: 'emoji' | 'icon'; value: string } | null;
	description: string | null;
	owner: RemoteResourceOwner;
}
