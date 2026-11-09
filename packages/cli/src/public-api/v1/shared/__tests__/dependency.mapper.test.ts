import type { ResolvedDependenciesResult } from '@n8n/api-types';

import { decodeCursor } from '../services/pagination.service';
import { toDependencyListPublicDto } from '../dependency.mapper';

describe('toDependencyListPublicDto', () => {
	const result: ResolvedDependenciesResult = {
		dependencies: [
			{ type: 'workflowParent', id: 'wf-2', name: 'Beta' },
			{ type: 'credentialId', id: 'cred-1', name: 'Slack' },
			{ type: 'workflowParent', id: 'wf-1', name: 'Alpha', projectId: 'project-1' },
			{ type: 'agentUsage', id: 'agent-1', name: 'Helper', projectId: 'project-1' },
			{ type: 'workflowCall', id: 'wf-3', name: 'Child' },
			{ type: 'dataTableId', id: 'dt-1', name: 'Orders', projectId: 'project-2' },
			{ type: 'errorWorkflow', id: 'wf-4', name: 'On error' },
			{ type: 'errorWorkflowParent', id: 'wf-5', name: 'Uses me on error' },
		],
		inaccessibleCount: 3,
	};

	it('should map internal types to public types in a stable order', () => {
		const dto = toDependencyListPublicDto(result, { offset: 0, limit: 100 });

		expect(dto).toEqual({
			data: [
				{ type: 'agent', id: 'agent-1', name: 'Helper', projectId: 'project-1' },
				{ type: 'credential', id: 'cred-1', name: 'Slack' },
				{ type: 'dataTable', id: 'dt-1', name: 'Orders', projectId: 'project-2' },
				{ type: 'errorWorkflow', id: 'wf-4', name: 'On error' },
				{ type: 'errorWorkflowParent', id: 'wf-5', name: 'Uses me on error' },
				{ type: 'parentWorkflow', id: 'wf-1', name: 'Alpha', projectId: 'project-1' },
				{ type: 'parentWorkflow', id: 'wf-2', name: 'Beta' },
				{ type: 'subWorkflow', id: 'wf-3', name: 'Child' },
			],
			nextCursor: null,
			inaccessibleCount: 3,
		});
	});

	it('should return one page and a cursor to the next page', () => {
		const firstPage = toDependencyListPublicDto(result, { offset: 0, limit: 5 });

		expect(firstPage.data.map((d) => d.id)).toEqual(['agent-1', 'cred-1', 'dt-1', 'wf-4', 'wf-5']);
		expect(firstPage.inaccessibleCount).toBe(3);
		expect(decodeCursor(firstPage.nextCursor!)).toEqual({ offset: 5, limit: 5 });

		const secondPage = toDependencyListPublicDto(result, { offset: 5, limit: 5 });

		expect(secondPage.data.map((d) => d.id)).toEqual(['wf-1', 'wf-2', 'wf-3']);
		expect(secondPage.nextCursor).toBeNull();
	});

	it('should return an empty page when the resource has no dependencies', () => {
		expect(toDependencyListPublicDto(undefined, { offset: 0, limit: 10 })).toEqual({
			data: [],
			nextCursor: null,
			inaccessibleCount: 0,
		});
	});
});
