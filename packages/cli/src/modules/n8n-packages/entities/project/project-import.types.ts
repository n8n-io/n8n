import type { ProjectConflict } from '../../n8n-packages.types';
import type { SerializedProject } from '../../spec/serialized/project.schema';

export interface PreparedProject {
	sourceProjectId: string;
	name: string;
	description?: string;
	icon?: SerializedProject['icon'];
	customTelemetryTags?: SerializedProject['customTelemetryTags'];
}

export type ProjectPlannedAction = 'create' | 'update' | 'skip';

/** The package's own details for one project, as they would be written. */
export interface ProjectPlanFields {
	sourceProjectId: string;
	name: string;
	description?: string;
	icon?: SerializedProject['icon'];
	customTelemetryTags?: SerializedProject['customTelemetryTags'];
}

/**
 * The decided action for one package project. Discriminated by `action` so that `skip` — which
 * leaves the matched project in place — always carries the name it already has on the target,
 * and the writing actions cannot claim one.
 */
export type ProjectPlanItem =
	| ({ action: 'create' | 'update' } & ProjectPlanFields)
	| ({ action: 'skip'; existingName: string } & ProjectPlanFields);

export interface ProjectImportPlan {
	items: ProjectPlanItem[];
	conflicts: ProjectConflict[];
}
