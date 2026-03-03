import { Service } from '@n8n/di';
import { VariablesRepository } from '@n8n/db';

import type { ProjectExportContext } from '../import-export.types';
import { generateSlug } from '../slug.utils';

import { VariableSerializer } from './variable.serializer';
import type { ManifestVariableEntry } from './variable.types';

@Service()
export class VariableExporter {
	constructor(
		private readonly variablesRepository: VariablesRepository,
		private readonly variableSerializer: VariableSerializer,
	) {}

	async exportForProject(ctx: ProjectExportContext): Promise<ManifestVariableEntry[]> {
		const variables = await this.variablesRepository.find({
			where: { project: { id: ctx.projectId } },
		});

		if (variables.length === 0) return [];

		const entries: ManifestVariableEntry[] = [];

		for (const variable of variables) {
			const slug = generateSlug(variable.key, variable.id);
			const target = `${ctx.projectTarget}/variables/${slug}`;

			const serialized = this.variableSerializer.serialize(variable);

			ctx.writer.writeDirectory(target);
			ctx.writer.writeFile(`${target}/variable.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: variable.id,
				name: variable.key,
				target,
			});
		}

		return entries;
	}
}
