import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import type { SchemaMap } from './engine';

import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

@Service()
export class SchemaMapBuilder {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly globalConfig: GlobalConfig,
	) {}

	async forUser(user: User, referencedNames: string[]): Promise<SchemaMap> {
		const dialect = this.globalConfig.database.type;
		const tablePrefix = this.globalConfig.database.tablePrefix;

		const accessibleIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});

		const nameToId = new Map<string, string>();
		if (referencedNames.length > 0 && accessibleIds.length > 0) {
			const workflows = await this.workflowRepository.find({
				where: { id: In(accessibleIds), name: In(referencedNames) },
				select: ['id', 'name'],
			});
			for (const w of workflows) nameToId.set(w.name, w.id);
		}

		const accessibleSet = new Set(accessibleIds);

		return {
			dialect,
			tablePrefix,
			accessibleWorkflowIds: accessibleIds,
			resolveWorkflowId: (name) => nameToId.get(name) ?? null,
			hasReadAccess: (id) => accessibleSet.has(id),
		};
	}
}
