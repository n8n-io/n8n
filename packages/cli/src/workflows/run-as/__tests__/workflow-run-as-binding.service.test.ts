import type { User, WorkflowRunAsBindingRepository } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	RUN_AS_FEATURE_FLAG,
	WorkflowRunAsBindingService,
} from '../workflow-run-as-binding.service';

describe('WorkflowRunAsBindingService', () => {
	const originalEnv = process.env;
	let repository: Mocked<WorkflowRunAsBindingRepository>;
	let service: WorkflowRunAsBindingService;

	beforeEach(() => {
		process.env = { ...originalEnv };
		repository = mock<WorkflowRunAsBindingRepository>();
		service = new WorkflowRunAsBindingService(repository);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('claim', () => {
		it('revokes the active row and inserts one for the publisher as userId and setBy', async () => {
			const publisher = mock<User>({ id: 'user-1' });

			await service.claim('workflow-1', publisher);

			expect(repository.revokeActive).toHaveBeenCalledWith('workflow-1', undefined);
			expect(repository.insertActive).toHaveBeenCalledWith(
				{ workflowId: 'workflow-1', userId: 'user-1', setBy: 'user-1' },
				undefined,
			);
			const [revokeOrder] = repository.revokeActive.mock.invocationCallOrder;
			const [insertOrder] = repository.insertActive.mock.invocationCallOrder;
			expect(revokeOrder).toBeLessThan(insertOrder);
		});

		it('threads the transaction handle through to both repository calls', async () => {
			const publisher = mock<User>({ id: 'user-1' });
			const trx = mock<Parameters<WorkflowRunAsBindingRepository['insertActive']>[1]>();

			await service.claim('workflow-1', publisher, trx);

			expect(repository.revokeActive).toHaveBeenCalledWith('workflow-1', trx);
			expect(repository.insertActive).toHaveBeenCalledWith(
				{ workflowId: 'workflow-1', userId: 'user-1', setBy: 'user-1' },
				trx,
			);
		});
	});

	describe('revoke', () => {
		it('revokes the active row', async () => {
			await service.revoke('workflow-1');

			expect(repository.revokeActive).toHaveBeenCalledWith('workflow-1', undefined);
		});
	});

	describe('getActive', () => {
		it('returns the active row userId when one exists', async () => {
			repository.findActiveByWorkflowId.mockResolvedValue(
				mock({ userId: 'user-1' }) as Awaited<
					ReturnType<WorkflowRunAsBindingRepository['findActiveByWorkflowId']>
				>,
			);

			await expect(service.getActive('workflow-1')).resolves.toEqual({ userId: 'user-1' });
		});

		it('returns null when no active row exists', async () => {
			repository.findActiveByWorkflowId.mockResolvedValue(null);

			await expect(service.getActive('workflow-1')).resolves.toBeNull();
		});
	});

	describe('isEnabled', () => {
		it('follows the env feature flag', () => {
			process.env[RUN_AS_FEATURE_FLAG] = 'true';
			expect(service.isEnabled()).toBe(true);

			process.env[RUN_AS_FEATURE_FLAG] = 'false';
			expect(service.isEnabled()).toBe(false);

			delete process.env[RUN_AS_FEATURE_FLAG];
			expect(service.isEnabled()).toBe(false);
		});
	});
});
