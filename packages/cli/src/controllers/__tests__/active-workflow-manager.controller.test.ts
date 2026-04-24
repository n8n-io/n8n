import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ActiveWorkflowManagerController } from '@/controllers/active-workflow-manager.controller';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

describe('ActiveWorkflowManagerController', () => {
	const logger = mock<Logger>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const workflowRepository = mock<WorkflowRepository>();
	let controller: ActiveWorkflowManagerController;

	const reqFrom = (remoteAddress: string | undefined) =>
		mock<Request>({ socket: { remoteAddress } as Request['socket'] });

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		controller = new ActiveWorkflowManagerController(
			logger,
			activeWorkflowManager,
			workflowRepository,
		);
	});

	it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
		'accepts requests from loopback address %s',
		async (remoteAddress) => {
			workflowRepository.findOne.mockResolvedValue({
				id: 'w1',
				activeVersionId: null,
			} as never);

			const result = await controller.refresh(reqFrom(remoteAddress), mock<Response>(), {
				workflowId: 'w1',
			});

			expect(result).toEqual({ applied: 'removed' });
			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('w1');
		},
	);

	it('rejects requests from non-loopback addresses', async () => {
		await expect(
			controller.refresh(reqFrom('10.0.0.5'), mock<Response>(), { workflowId: 'w1' }),
		).rejects.toBeInstanceOf(UnauthenticatedError);

		expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
		expect(workflowRepository.findOne).not.toHaveBeenCalled();
	});

	it('rejects requests with no remote address', async () => {
		await expect(
			controller.refresh(reqFrom(undefined), mock<Response>(), { workflowId: 'w1' }),
		).rejects.toBeInstanceOf(UnauthenticatedError);

		expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
	});

	it('returns noop when workflow is still active in DB', async () => {
		workflowRepository.findOne.mockResolvedValue({
			id: 'w1',
			activeVersionId: 'v1',
		} as never);

		const result = await controller.refresh(reqFrom('127.0.0.1'), mock<Response>(), {
			workflowId: 'w1',
		});

		expect(result).toEqual({ applied: 'noop' });
		expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
	});

	it('calls activeWorkflowManager.remove when workflow is missing from DB', async () => {
		workflowRepository.findOne.mockResolvedValue(null);

		const result = await controller.refresh(reqFrom('127.0.0.1'), mock<Response>(), {
			workflowId: 'w1',
		});

		expect(result).toEqual({ applied: 'removed' });
		expect(activeWorkflowManager.remove).toHaveBeenCalledWith('w1');
	});
});
