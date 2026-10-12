import type { Project } from '@n8n/db';
import { Service } from '@n8n/di';

import { ProjectSerializer } from './project.serializer';
import { packageDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';

export interface ProjectShellExportContext {
	writer: PackageWriter;
	projectEntries: ManifestEntry[];
	projectTargetsById: Map<string, string>;
}

@Service()
export class ProjectShellExporter {
	constructor(private readonly projectSerializer: ProjectSerializer) {}

	async export(project: Project, context: ProjectShellExportContext): Promise<string> {
		const existing = context.projectTargetsById.get(project.id);
		if (existing !== undefined) return existing;

		const entry = await writeManifestEntry(
			context.writer,
			'projects',
			packageDirectory('projects'),
			project,
			this.projectSerializer.serialize(project),
		);

		context.projectEntries.push(entry);
		context.projectTargetsById.set(entry.id, entry.target);
		return entry.target;
	}
}
