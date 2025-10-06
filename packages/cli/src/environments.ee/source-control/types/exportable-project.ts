import type { TeamResourceOwner } from './resource-owner';

export interface ExportableProject {
	id: string;
	name: string;
	icon: { type: 'emoji' | 'icon'; value: string } | null;
	description: string | null;
	/**
	 * Only team projects are supported
	 */
	type: 'team';
	owner: TeamResourceOwner;
}

export type ExportableProjectWithFileName = ExportableProject & {
	filename: string;
};
