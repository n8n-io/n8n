import { Service } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';

import type { Importer } from '../importer';
import type { ProjectImportContext } from '../import-export.types';
import type { ManifestVariableEntry, SerializedVariable } from './variable.types';

@Service()
export class VariableImporter implements Importer<ManifestVariableEntry> {
	constructor(private readonly variablesService: VariablesService) {}

	async importForProject(ctx: ProjectImportContext, entries: ManifestVariableEntry[]) {
		for (const entry of entries) {
			const content = ctx.reader.readFile(`${entry.target}/variable.json`);
			const variable = JSON.parse(content) as SerializedVariable;

			await this.variablesService.create(ctx.user, {
				key: variable.key,
				value: variable.value,
				type: variable.type as 'string',
				projectId: ctx.projectId,
			});
		}
	}
}
