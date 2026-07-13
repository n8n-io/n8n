import type { Project } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedProjectSchema,
	type SerializedProject,
} from '../../spec/serialized/project.schema';

@Service()
export class ProjectSerializer {
	serialize(project: Project): SerializedProject {
		return serializedProjectSchema.parse({
			id: project.id,
			name: project.name,
			...(project.description !== null ? { description: project.description } : {}),
			...(project.icon !== null ? { icon: project.icon } : {}),
		});
	}
}
