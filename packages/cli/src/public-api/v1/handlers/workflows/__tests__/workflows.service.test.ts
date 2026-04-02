/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/promise-function-async -- jest mocks */
import type { User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { createWorkflow } from '../workflows.service';

import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

describe('createWorkflow (public API)', () => {
	const user = mock<User>({ id: 'user-id' });
	const workflowCreationService = mock<WorkflowCreationService>();

	const baseBody = (): WorkflowEntity & { projectId?: string } =>
		Object.assign(new WorkflowEntity(), {
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			settings: {},
		});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === WorkflowCreationService) return workflowCreationService;
			return mock();
		});
	});

	it('delegates to WorkflowCreationService with publicApi and strips projectId from the entity', async () => {
		const saved = mock<WorkflowEntity>({ id: 'wf-1' });
		workflowCreationService.createWorkflow.mockResolvedValue(saved);

		const body = Object.assign(baseBody(), { projectId: 'proj-1' });
		const result = await createWorkflow(user, body);

		expect(result).toBe(saved);
		expect(workflowCreationService.createWorkflow).toHaveBeenCalledTimes(1);
		const [u, workflowArg, opts] = workflowCreationService.createWorkflow.mock.calls[0];
		expect(u).toBe(user);
		expect(opts).toEqual({ projectId: 'proj-1', publicApi: true });
		expect('projectId' in (workflowArg as object)).toBe(false);
		expect(workflowArg.name).toBe('Test Workflow');
	});
});
