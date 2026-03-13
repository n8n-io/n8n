import type {
	DependenciesBatchResponse,
	DependencyCountsBatchResponse,
	ResolvedDependency,
} from '@n8n/api-types';
import { CredentialsRepository, WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

@Service()
export class WorkflowDependencyQueryService {
	constructor(
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {}

	/**
	 * Lightweight counts-only query for resource cards.
	 * - For workflows: returns { credentialId: N, dataTableId: N, workflowCall: N, workflowParent: N }
	 * - For credentials / data tables: returns { workflowParent: N }
	 */
	async getDependencyCounts(resourceIds: string[]): Promise<DependencyCountsBatchResponse> {
		const raw = await this.getResourceDependencies(resourceIds, false);

		const result: DependencyCountsBatchResponse = {};
		for (const [k, v] of Object.entries(raw)) {
			result[k] = { credentialId: 0, dataTableId: 0, workflowCall: 0, workflowParent: 0 };

			for (const { type } of v) {
				switch (type) {
					case 'credentialId':
						result[k].credentialId++;
						break;
					case 'dataTableId':
						result[k].dataTableId++;
						break;
					case 'workflowCall':
						result[k].workflowCall++;
						break;
					case 'workflowParent':
						result[k].workflowParent++;
						break;
				}
			}
		}
		return result;
	}

	async getResourceDependencies(
		resourceIds: string[],
		enrichResources = true,
	): Promise<DependenciesBatchResponse> {
		const rawDeps = await this.dependencyRepository.find({
			where: [
				{
					workflowId: In(resourceIds),
					dependencyType: In(['credentialId', 'dataTableId', 'workflowCall']),
				},
				{ dependencyKey: In(resourceIds) },
			],
			select: ['workflowId', 'dependencyType', 'dependencyKey'],
		});

		if (rawDeps.length === 0) {
			return {};
		}

		const addToSet = (map: Map<string, Set<string>>, key: string, val: string) => {
			let set = map.get(key);
			if (!set) {
				set = new Set();
				map.set(key, set);
			}
			set.add(val);
		};

		const credMap = new Map<string, Set<string>>();
		const dtMap = new Map<string, Set<string>>();
		const subMap = new Map<string, Set<string>>();
		const parentMap = new Map<string, Set<string>>();

		const credNames = new Map<string, string | null>();
		const wfNames = new Map<string, string | null>();
		const dataTableNames = new Map<string, { name: string; projectId: string } | null>();

		for (const dep of rawDeps) {
			wfNames.set(dep.workflowId, null);
			addToSet(parentMap, dep.dependencyKey, dep.workflowId);
			switch (dep.dependencyType) {
				case 'credentialId':
					addToSet(credMap, dep.workflowId, dep.dependencyKey);
					credNames.set(dep.dependencyKey, null);
					break;
				case 'dataTableId':
					addToSet(dtMap, dep.workflowId, dep.dependencyKey);
					dataTableNames.set(dep.dependencyKey, null);
					break;
				case 'workflowCall':
					addToSet(subMap, dep.workflowId, dep.dependencyKey);
					wfNames.set(dep.dependencyKey, null);
					break;
			}
		}

		if (enrichResources) {
			await this.enrichResources(credNames, wfNames, dataTableNames);
		}

		const result: Record<string, ResolvedDependency[]> = {};
		for (const resourceId of resourceIds) {
			const deps: ResolvedDependency[] = [];

			for (const id of subMap.get(resourceId) ?? []) {
				deps.push({ id, name: wfNames.get(id)!, type: 'workflowCall' });
			}
			for (const id of parentMap.get(resourceId) ?? []) {
				deps.push({ id, name: wfNames.get(id)!, type: 'workflowParent' });
			}
			for (const id of credMap.get(resourceId) ?? []) {
				deps.push({ id, name: credNames.get(id)!, type: 'credentialId' });
			}
			for (const id of dtMap.get(resourceId) ?? []) {
				const { name, projectId } = dataTableNames.get(id)!;
				deps.push({ id, name, type: 'dataTableId', projectId });
			}

			result[resourceId] = deps;
		}

		return result;
	}

	private async enrichResources(
		credNames: Map<string, string | null>,
		wfNames: Map<string, string | null>,
		dataTableNames: Map<string, { name: string; projectId: string } | null>,
	) {
		const [credentials, workflows, dataTables] = await Promise.all([
			credNames.size > 0
				? this.credentialsRepository.find({
						where: { id: In([...credNames.keys()]) },
						select: ['id', 'name'],
					})
				: [],
			wfNames.size > 0
				? this.workflowRepository.find({
						where: { id: In([...wfNames.keys()]) },
						select: ['id', 'name'],
					})
				: [],
			dataTableNames.size > 0
				? this.dataTableRepository.find({
						where: { id: In([...dataTableNames.keys()]) },
						select: ['id', 'name', 'projectId'],
					})
				: [],
		]);

		for (const c of credentials) credNames.set(c.id, c.name ?? c.id);
		for (const w of workflows) wfNames.set(w.id, w.name ?? w.id);
		for (const dt of dataTables)
			dataTableNames.set(dt.id, { name: dt.name ?? dt.id, projectId: dt.projectId });
	}
}
