import type {
	DependencyListPublicDto,
	DependencyPublicType,
	DependencyType,
	ResolvedDependenciesResult,
} from '@n8n/api-types';

import { paginateArray } from './services/pagination.service';

const PUBLIC_DEPENDENCY_TYPES: Record<DependencyType, DependencyPublicType> = {
	agentUsage: 'agent',
	credentialId: 'credential',
	dataTableId: 'dataTable',
	errorWorkflow: 'errorWorkflow',
	errorWorkflowParent: 'errorWorkflowParent',
	workflowCall: 'subWorkflow',
	workflowParent: 'parentWorkflow',
};

/**
 * The service resolves and access-filters the full list in memory, so pages are cut from it.
 * The sort makes the order stable between requests, which offset cursors need.
 */
export function toDependencyListPublicDto(
	result: ResolvedDependenciesResult | undefined,
	pagination: { offset: number; limit: number },
): DependencyListPublicDto {
	const dependencies = (result?.dependencies ?? [])
		.map(({ type, id, name, projectId }) => ({
			type: PUBLIC_DEPENDENCY_TYPES[type],
			id,
			name,
			...(projectId ? { projectId } : {}),
		}))
		.sort(
			(a, b) =>
				a.type.localeCompare(b.type) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
		);

	return {
		...paginateArray(dependencies, pagination),
		inaccessibleCount: result?.inaccessibleCount ?? 0,
	};
}
