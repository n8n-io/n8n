import { Service } from '@n8n/di';
import { pickVariableForProject } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';

import type { VariableImportPlan, VariableImportRequest } from './variable.types';
import type { ImportContext } from '../../n8n-packages.types';

@Service()
export class VariableImporter {
	constructor(private readonly variablesService: VariablesService) {}

	/**
	 * Resolves the package's variable requirements against the target project
	 * (then global), mirroring runtime `$vars` precedence. Read-only for
	 * `do-nothing`: matched names and unresolved names are reported, nothing
	 * is created.
	 */
	async plan(context: ImportContext, request: VariableImportRequest): Promise<VariableImportPlan> {
		const requirements = request.requirements ?? [];
		if (requirements.length === 0) return { matched: [], missing: [] };

		const allVariables = await this.variablesService.getAllCached();
		const variablesByKey = new Map<string, typeof allVariables>();
		for (const variable of allVariables) {
			const bucket = variablesByKey.get(variable.key);
			if (bucket) bucket.push(variable);
			else variablesByKey.set(variable.key, [variable]);
		}

		const matched: string[] = [];
		const missing: string[] = [];

		for (const { name } of requirements) {
			const picked = pickVariableForProject(
				variablesByKey.get(name) ?? [],
				name,
				context.projectId,
			);
			if (picked) matched.push(name);
			else missing.push(name);
		}

		return { matched, missing };
	}
}
