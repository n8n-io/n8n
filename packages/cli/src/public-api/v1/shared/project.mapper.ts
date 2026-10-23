import type { ProjectPublic } from '@n8n/api-types';
import type { Project } from '@n8n/db';

/** A cached entity is read back as JSON, so a date can already be an ISO string. */
function toIsoString(value: Date | string): string {
	return typeof value === 'string' ? value : value.toISOString();
}

export function toPublicProject(project: Project): ProjectPublic {
	return {
		id: project.id,
		name: project.name,
		type: project.type,
		icon: project.icon,
		description: project.description,
		customTelemetryTags: project.customTelemetryTags,
		creatorId: project.creatorId,
		createdAt: toIsoString(project.createdAt),
		updatedAt: toIsoString(project.updatedAt),
	};
}
