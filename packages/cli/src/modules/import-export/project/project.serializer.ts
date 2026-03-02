import { Service } from '@n8n/di';
import type { Project } from '@n8n/db';

import type { Serializer } from '../serializer';
import type { SerializedProject } from './project.types';

@Service()
export class ProjectSerializer implements Serializer<Project, SerializedProject> {
	serialize(project: Project): SerializedProject {
		const serialized: SerializedProject = {
			id: project.id,
			name: project.name,
		};

		if (project.description !== null) {
			serialized.description = project.description;
		}

		if (project.icon !== null) {
			serialized.icon = project.icon;
		}

		return serialized;
	}
}
