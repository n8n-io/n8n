import { mockInstance } from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, Variables } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { OwnershipService } from '@/services/ownership.service';
import {
	getVariables,
	replaceInvalidCredentials,
	shouldRestartParentExecution,
} from '@/workflow-helpers';

describe('workflow-helpers', () => {
	beforeAll(() => {
		mockInstance(VariablesService, {
			async getAllCached() {
				return [
					{ id: '1', key: 'VAR1', value: 'value1' },
					{ id: '2', key: 'VAR2', value: 'value2' },
					{
						id: '3',
						key: 'VAR2',
						value: 'value1Project',
						project: { id: '1', name: 'project1' } as Project,
					},
					{
						id: '4',
						key: 'VAR4',
						value: 'value4',
						project: { id: '1', name: 'project1' } as Project,
					},
					{
						id: '5',
						key: 'VAR5',
						value: 'value5',
						project: { id: '2', name: 'project2' } as Project,
					},
				] as Variables[];
			},
		});

		mockInstance(OwnershipService, {
			async getWorkflowProjectCached(_workflowId: string) {
				return { id: '1', name: 'project' } as unknown as Project;
			},
		});
	});

	describe('getVariables', () => {
		it('should return all variables as key-value pairs if no parameters are given', async () => {
			const variables = await getVariables();
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value2' });
		});

		it('should return global and project variables if projectId is given', async () => {
			const variables = await getVariables(undefined, '1');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value1Project', VAR4: 'value4' });
		});

		it('should return global and project variables if workflowId is given', async () => {
			const variables = await getVariables('1');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value1Project', VAR4: 'value4' });
		});

		it('should prioritize passed of projectId over workflowId', async () => {
			const variables = await getVariables('1', '2');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value2', VAR5: 'value5' });
		});
	});
});

describe('shouldRestartParentExecution', () => {
	it('should return false when parentExecution is undefined', () => {
		expect(shouldRestartParentExecution(undefined)).toBe(false);
	});

	it('should return false when shouldResume is explicitly false', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: false,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(false);
	});

	it('should return true when shouldResume is undefined', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: undefined,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(true);
	});

	it('should return true when shouldResume is true', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: true,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(true);
	});
});

describe('replaceInvalidCredentials', () => {
	const credentialsRepository = mockInstance(CredentialsRepository);

	afterEach(() => jest.clearAllMocks());

	function makeWorkflow(credentials: Record<string, { id: string | null; name: string }>) {
		return {
			nodes: [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [0, 0] as [number, number],
					parameters: {},
					credentials,
				},
			],
			connections: {},
		} as unknown as IWorkflowBase;
	}

	it('should resolve credentials by name scoped to the given project', async () => {
		const cred = { id: 'cred-1', name: 'My Cred' } as CredentialsEntity;
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([cred]);

		const workflow = makeWorkflow({ httpHeaderAuth: { id: null, name: 'My Cred' } });
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(credentialsRepository.findByNameAndTypeInProject).toHaveBeenCalledWith(
			'My Cred',
			'httpHeaderAuth',
			'project-1',
		);
		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: 'cred-1',
			name: 'My Cred',
		});
	});

	it('should not resolve when no matching credential exists in the project', async () => {
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([]);

		const workflow = makeWorkflow({ httpHeaderAuth: { id: null, name: 'Unknown' } });
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: null,
			name: 'Unknown',
		});
	});

	it('should not resolve when multiple credentials match in the project', async () => {
		const cred1 = { id: 'cred-1', name: 'Dup' } as CredentialsEntity;
		const cred2 = { id: 'cred-2', name: 'Dup' } as CredentialsEntity;
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([cred1, cred2]);

		const workflow = makeWorkflow({ httpHeaderAuth: { id: null, name: 'Dup' } });
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: null,
			name: 'Dup',
		});
	});

	it('should fall back to name lookup within project when credential ID is not found', async () => {
		const cred = { id: 'cred-new', name: 'My Cred' } as CredentialsEntity;
		credentialsRepository.findOneBy.mockResolvedValueOnce(null);
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([cred]);

		const workflow = makeWorkflow({
			httpHeaderAuth: { id: 'cred-deleted', name: 'My Cred' },
		});
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(credentialsRepository.findByNameAndTypeInProject).toHaveBeenCalledWith(
			'My Cred',
			'httpHeaderAuth',
			'project-1',
		);
		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: 'cred-new',
			name: 'My Cred',
		});
	});

	it('should skip credential types that resolve to object internal keys', async () => {
		// JSON.parse keeps `__proto__` as an own enumerable key, unlike an object literal.
		const credentials = JSON.parse(
			'{"__proto__":{"id":"injected","name":"injected"},"constructor":{"id":"injected","name":"injected"}}',
		) as Record<string, { id: string; name: string }>;
		const workflow = makeWorkflow(credentials);

		await replaceInvalidCredentials(workflow, 'project-1');

		expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		expect(credentialsRepository.findByNameAndTypeInProject).not.toHaveBeenCalled();
		expect(({} as Record<string, unknown>).id).toBeUndefined();
		expect(({} as Record<string, unknown>).injected).toBeUndefined();
	});
});
