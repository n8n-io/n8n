import { Service } from '@n8n/di';
import { VariablesRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { EntityExporter } from '../entity-exporter';
import { writeEntityFiles } from '../entity-exporter';
import type { ExportScope } from '../../import-export.types';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';
import type { PackageRequirements } from '../../spec/requirements.types';

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

	async backfill(
		requirements: PackageRequirements,
		current: ManifestEntry[],
		scope: ExportScope,
	): Promise<ManifestEntry[]> {
		// Variables key on `name`, not `id`. The export option to skip
		// values is honoured during backfill too.
		if (scope.entityOptions.variables?.includeValues === false) return [];

		const alreadyIncluded = new Set(current.map((e) => e.name));
		const missing = requirements.variables
			.filter((r) => !alreadyIncluded.has(r.name))
			.map((r) => r.name);

		if (missing.length === 0) return [];

		const variables = await this.variablesRepository.find({
			where: { key: In(missing) },
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
