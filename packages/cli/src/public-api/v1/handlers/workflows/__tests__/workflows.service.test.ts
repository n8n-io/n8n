/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/promise-function-async -- jest mocks */
import type { User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { createWorkflow } from '../workflows.service';

describe('createWorkflow (public API)', () => {
	const user = mock<User>({ id: 'user-id' });
	const workflowCreationService = mock<WorkflowCreationService>();
	const redactionEnforcementService = mock<RedactionEnforcementService>();

	const baseBody = (
		settings: WorkflowEntity['settings'] = {},
	): WorkflowEntity & { projectId?: string } =>
		Object.assign(new WorkflowEntity(), {
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			settings,
		});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === WorkflowCreationService) return workflowCreationService;
			if (serviceClass === RedactionEnforcementService) return redactionEnforcementService;
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
		expect(opts).toEqual({ projectId: 'proj-1', publicApi: true, source: 'api' });
		expect('projectId' in (workflowArg as object)).toBe(false);
		expect(workflowArg.name).toBe('Test Workflow');
	});

	it('asserts the supplied redaction policy against the floor before creating', async () => {
		workflowCreationService.createWorkflow.mockResolvedValue(mock<WorkflowEntity>());

		await createWorkflow(user, baseBody({ redactionPolicy: 'none' }));

		expect(redactionEnforcementService.assertNewPolicyAllowed).toHaveBeenCalledWith('none');
	});

	it('rejects and does not create when the supplied policy is below the floor', async () => {
		redactionEnforcementService.assertNewPolicyAllowed.mockRejectedValue(
			new UnprocessableRequestError(
				'Workflow redaction policy cannot be weaker than the instance floor.',
			),
		);

		await expect(createWorkflow(user, baseBody({ redactionPolicy: 'none' }))).rejects.toThrow(
			UnprocessableRequestError,
		);

		expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
	});
});
