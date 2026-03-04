import type {
	ResourceDependentsBatchResponse,
	WorkflowDependenciesBatchResponse,
} from '@n8n/api-types';
import {
	CredentialsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

/** Forward dependency types to query from the database (subset of DependencyType) */
const DEPENDENCY_TYPES_TO_SHOW: Array<'credentialId' | 'dataTableId' | 'workflowCall'> = [
	'credentialId',
	'dataTableId',
	'workflowCall',
];

@Service()
export class WorkflowDependencyQueryService {
	constructor(
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async getResolvedDependencies(workflowIds: string[]): Promise<WorkflowDependenciesBatchResponse> {
		const [rawDeps, reverseDeps] = await Promise.all([
			this.dependencyRepository.getDependenciesForWorkflows(workflowIds, DEPENDENCY_TYPES_TO_SHOW),
			this.dependencyRepository.getReverseDependencies(workflowIds, 'workflowCall'),
		]);

		if (rawDeps.length === 0 && reverseDeps.length === 0) {
			return {};
		}

		const credentialIds = new Set<string>();
		const workflowCallIds = new Set<string>();
		const dataTableIds = new Set<string>();
		const parentWorkflowIds = new Set<string>();

		for (const dep of rawDeps) {
			switch (dep.dependencyType) {
				case 'credentialId':
					credentialIds.add(dep.dependencyKey);
					break;
				case 'workflowCall':
					workflowCallIds.add(dep.dependencyKey);
					break;
				case 'dataTableId':
					dataTableIds.add(dep.dependencyKey);
					break;
			}
		}

		for (const dep of reverseDeps) {
			parentWorkflowIds.add(dep.workflowId);
		}

		// Combine all workflow IDs we need to resolve (sub-workflows + parent workflows)
		const allWorkflowIds = new Set([...workflowCallIds, ...parentWorkflowIds]);

		const [credentials, workflows, dataTables, credentialShares, workflowShares] =
			await Promise.all([
				credentialIds.size > 0
					? this.credentialsRepository.find({
							where: { id: In([...credentialIds]) },
							select: ['id', 'name'],
						})
					: [],
				allWorkflowIds.size > 0
					? this.workflowRepository.find({
							where: { id: In([...allWorkflowIds]) },
							select: ['id', 'name'],
						})
					: [],
				dataTableIds.size > 0
					? this.dataTableRepository.find({
							where: { id: In([...dataTableIds]) },
							select: ['id', 'name', 'projectId'],
						})
					: [],
				credentialIds.size > 0
					? this.sharedCredentialsRepository.find({
							where: {
								credentialsId: In([...credentialIds]),
								role: 'credential:owner',
							},
							select: ['credentialsId', 'projectId'],
						})
					: [],
				allWorkflowIds.size > 0
					? this.sharedWorkflowRepository.find({
							where: {
								workflowId: In([...allWorkflowIds]),
								role: 'workflow:owner',
							},
							select: ['workflowId', 'projectId'],
						})
					: [],
			]);

		const credentialNameMap = new Map<string, string>();
		for (const c of credentials) credentialNameMap.set(c.id, c.name);

		const credentialProjectMap = new Map<string, string>();
		for (const sc of credentialShares) credentialProjectMap.set(sc.credentialsId, sc.projectId);

		const workflowNameMap = new Map<string, string>();
		for (const w of workflows) workflowNameMap.set(w.id, w.name);

		const workflowProjectMap = new Map<string, string>();
		for (const sw of workflowShares) workflowProjectMap.set(sw.workflowId, sw.projectId);

		const dataTableMap = new Map<string, { name: string; projectId: string }>();
		for (const dt of dataTables)
			dataTableMap.set(dt.id, { name: dt.name, projectId: dt.projectId });

		const result: WorkflowDependenciesBatchResponse = {};

		// Forward dependencies (what each workflow depends on)
		for (const dep of rawDeps) {
			if (!result[dep.workflowId]) result[dep.workflowId] = [];

			const existing = result[dep.workflowId].find(
				(d) => d.type === dep.dependencyType && d.id === dep.dependencyKey,
			);
			if (existing) continue;

			if (dep.dependencyType === 'dataTableId') {
				const dt = dataTableMap.get(dep.dependencyKey);
				result[dep.workflowId].push({
					type: 'dataTableId',
					id: dep.dependencyKey,
					name: dt?.name ?? dep.dependencyKey,
					projectId: dt?.projectId,
				});
			} else if (dep.dependencyType === 'credentialId') {
				result[dep.workflowId].push({
					type: 'credentialId',
					id: dep.dependencyKey,
					name: credentialNameMap.get(dep.dependencyKey) ?? dep.dependencyKey,
					projectId: credentialProjectMap.get(dep.dependencyKey),
				});
			} else if (dep.dependencyType === 'workflowCall') {
				result[dep.workflowId].push({
					type: 'workflowCall',
					id: dep.dependencyKey,
					name: workflowNameMap.get(dep.dependencyKey) ?? dep.dependencyKey,
					projectId: workflowProjectMap.get(dep.dependencyKey),
				});
			}
		}

		// Reverse dependencies (parent workflows that call each workflow)
		for (const dep of reverseDeps) {
			const calledWorkflowId = dep.dependencyKey;
			if (!result[calledWorkflowId]) result[calledWorkflowId] = [];

			const existing = result[calledWorkflowId].find(
				(d) => d.type === 'workflowParent' && d.id === dep.workflowId,
			);
			if (existing) continue;

			result[calledWorkflowId].push({
				type: 'workflowParent',
				id: dep.workflowId,
				name: workflowNameMap.get(dep.workflowId) ?? dep.workflowId,
				projectId: workflowProjectMap.get(dep.workflowId),
			});
		}

		return result;
	}

	/**
	 * Find which workflows depend on the given resources.
	 * Used for credential cards and data table cards to show "used by N workflows".
	 */
	async getResourceDependents(
		resourceIds: string[],
		resourceType: 'credentialId' | 'dataTableId',
	): Promise<ResourceDependentsBatchResponse> {
		const reverseDeps = await this.dependencyRepository.getReverseDependencies(
			resourceIds,
			resourceType,
		);

		if (reverseDeps.length === 0) {
			return {};
		}

		const workflowIds = new Set<string>();
		for (const dep of reverseDeps) {
			workflowIds.add(dep.workflowId);
		}

		const wfIds = [...workflowIds];
		const [workflows, wfShares] = await Promise.all([
			wfIds.length > 0
				? this.workflowRepository.find({
						where: { id: In(wfIds) },
						select: ['id', 'name'],
					})
				: [],
			wfIds.length > 0
				? this.sharedWorkflowRepository.find({
						where: { workflowId: In(wfIds), role: 'workflow:owner' },
						select: ['workflowId', 'projectId'],
					})
				: [],
		]);

		const workflowNameMap = new Map<string, string>();
		for (const w of workflows) workflowNameMap.set(w.id, w.name);

		const wfProjectMap = new Map<string, string>();
		for (const sw of wfShares) wfProjectMap.set(sw.workflowId, sw.projectId);

		const result: ResourceDependentsBatchResponse = {};
		for (const dep of reverseDeps) {
			const resourceId = dep.dependencyKey;
			if (!result[resourceId]) result[resourceId] = [];

			const existing = result[resourceId].find((d) => d.id === dep.workflowId);
			if (existing) continue;

			result[resourceId].push({
				id: dep.workflowId,
				name: workflowNameMap.get(dep.workflowId) ?? dep.workflowId,
				projectId: wfProjectMap.get(dep.workflowId),
			});
		}

		return result;
	}
}
