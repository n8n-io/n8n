import { Service } from '@n8n/di';
import { VariablesRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { EntityExporter } from '../entity-exporter';
import { writeEntityFiles } from '../entity-exporter';
import type { EntityKey, ExportScope, ManifestEntry } from '../import-export.types';

@Service()
export class VariableExporter implements EntityExporter {
	readonly entityKey: EntityKey = 'variables';

	constructor(private readonly variablesRepository: VariablesRepository) {}

	async export(scope: ExportScope): Promise<ManifestEntry[]> {
		if (!scope.projectId) return [];

		if (scope.entityOptions.variables?.includeValues === false) return [];

		const variables = await this.variablesRepository.find({
			where: { project: { id: scope.projectId } },
		});

		if (variables.length === 0) return [];

		return this.writeVariables(variables, scope);
	}

	/**
	 * Export specific variables by key name. Used by the pipeline to include
	 * referenced variables in workflow/folder packages.
	 */
	async exportByNames(names: string[], scope: ExportScope): Promise<ManifestEntry[]> {
		if (names.length === 0) return [];
		if (scope.entityOptions.variables?.includeValues === false) return [];

		const variables = await this.variablesRepository.find({
			where: { key: In(names) },
		});

		if (variables.length === 0) return [];

		return this.writeVariables(variables, scope);
	}

	private writeVariables(
		variables: Array<{ id: string; key: string; value: string; type: string }>,
		scope: ExportScope,
	): ManifestEntry[] {
		return writeEntityFiles(variables, scope, {
			resourceDir: 'variables',
			filename: 'variable.json',
			getId: (v) => v.id,
			getName: (v) => v.key,
			serialize: (v) => ({ id: v.id, key: v.key, type: v.type, value: v.value }),
		});
	}
}
