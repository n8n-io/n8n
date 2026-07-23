import type { SerializedProject } from '../../spec/serialized/project.schema';

export interface PreparedProject {
	sourceProjectId: string;
	name: string;
	description?: string;
	icon?: SerializedProject['icon'];
}

export type ProjectPlannedAction = 'create' | 'update';

export interface ProjectPlanItem {
	action: ProjectPlannedAction;
	sourceProjectId: string;
	name: string;
	description?: string;
	icon?: SerializedProject['icon'];
}
