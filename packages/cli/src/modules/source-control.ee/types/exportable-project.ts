import type { ExportableVariable } from './exportable-variable.js';
import type { TeamResourceOwner } from './resource-owner.js';

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
	variableStubs?: ExportableVariable[];
}

export type ExportableProjectWithFileName = ExportableProject & {
	filename: string;
};
