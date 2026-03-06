import { Service } from '@n8n/di';
import { generateNanoId, Variables, VariablesRepository } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';

import type { EntityImporter } from '../entity-importer';
import type { EntityKey, ImportScope, ManifestEntry } from '../import-export.types';
import type { SerializedVariable } from './variable.types';

@Service()
export class VariableImporter implements EntityImporter {
	readonly entityKey: EntityKey = 'variables';

	constructor(private readonly variablesRepository: VariablesRepository) {}

	async import(scope: ImportScope, entries: ManifestEntry[]) {
		if (scope.entityOptions.variables?.withValues === false) return;

		const repo = scope.entityManager?.getRepository(Variables) ?? this.variablesRepository;
		const overwrite = scope.entityOptions.variables?.overwriteValues ?? false;

		for (const entry of entries) {
			console.log('Importing', entry);
			const content = scope.reader.readFile(`${entry.target}/variable.json`);
			const variable: SerializedVariable = jsonParse(content);

			const existing = await repo.findOne({
				where: { key: variable.key, project: { id: scope.targetProjectId } },
			});

			if (existing) {
				console.log('EXISTS', existing);
				if (overwrite) {
					await repo.update(existing.id, { value: variable.value });
				}
				// Otherwise skip — keep the target instance's value
			} else {
				await repo.save({
					id: generateNanoId(),
					key: variable.key,
					value: variable.value,
					type: variable.type as 'string',
					project: { id: scope.targetProjectId },
				});
			}
		}
	}
}
