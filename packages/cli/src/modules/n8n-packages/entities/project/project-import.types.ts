import type { SerializedProject } from '../../spec/serialized/project.schema';

/** A project shell parsed out of the package, ready to reconcile against the instance. */
export interface PreparedProject {
	sourceProjectId: string;
	name: string;
	description?: string;
	icon?: SerializedProject['icon'];
}

export type ProjectPlannedAction = 'create' | 'update';

/** The decided action for one package project (matched by id). */
export interface ProjectPlanItem {
	action: ProjectPlannedAction;
	sourceProjectId: string;
	name: string;
	description?: string;
	icon?: SerializedProject['icon'];
}
