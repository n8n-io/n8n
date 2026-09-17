import type { Project } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedProjectSchema,
	type SerializedProject,
} from '../../spec/serialized/project.schema';
import { definePackageSerializationPayload } from '../package-serialization.types';

type ProjectPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	type: 'exclude';
	icon: 'copy';
	description: 'copy';
	customTelemetryTags: 'copy';
	projectRelations: 'exclude';
	sharedCredentials: 'exclude';
	sharedWorkflows: 'exclude';
	secretsProviderAccess: 'exclude';
	variables: 'exclude';
	roleMappingRules: 'exclude';
	creatorId: 'exclude';
	creator: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	Project,
	SerializedProject,
	ProjectPackageKeyHandling
>();

@Service()
export class ProjectSerializer {
	serialize(project: Project): SerializedProject {
		return serializedProjectSchema.parse(
			serializePayload({
				id: project.id,
				name: project.name,
				...(project.description !== null ? { description: project.description } : {}),
				...(project.icon !== null ? { icon: project.icon } : {}),
				...(project.customTelemetryTags?.length
					? { customTelemetryTags: project.customTelemetryTags }
					: {}),
			}),
		);
	}
}
