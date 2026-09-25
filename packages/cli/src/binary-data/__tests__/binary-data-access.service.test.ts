import type { BinaryDataRepository, ExecutionRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { BinaryDataAccessService } from '../binary-data-access.service';

describe('BinaryDataAccessService', () => {
	const workflowSharingService = mock<WorkflowSharingService>();
	const executionRepository = mock<ExecutionRepository>();
	const binaryDataRepository = mock<BinaryDataRepository>();
	const service = new BinaryDataAccessService(
		workflowSharingService,
		executionRepository,
		binaryDataRepository,
	);

	const user = mock<User>();
	const uuid = '2c3f1e5a-0b6d-4c8e-9f11-abc123def456';

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('hasReadAccess', () => {
		describe('resolves the execution from a path-format id', () => {
			test.each(['filesystem', 'filesystem-v2', 's3', 'azure'])('for mode %s', async (mode) => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf1']);
				executionRepository.existsForAccessibleWorkflows.mockResolvedValue(true);

				const id = `${mode}:workflows/wf1/executions/exec1/binary_data/${uuid}`;
				const result = await service.hasReadAccess(user, id);

				expect(result).toBe(true);
				expect(workflowSharingService.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
					scopes: ['workflow:read'],
				});
				expect(executionRepository.existsForAccessibleWorkflows).toHaveBeenCalledWith('exec1', [
					'wf1',
				]);
				expect(binaryDataRepository.findSourceByFileId).not.toHaveBeenCalled();
			});
		});

		test('denies when the execution is not in an accessible workflow', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			executionRepository.existsForAccessibleWorkflows.mockResolvedValue(false);

			const id = `filesystem-v2:workflows/wf1/executions/exec1/binary_data/${uuid}`;
			expect(await service.hasReadAccess(user, id)).toBe(false);
		});

		test('resolves the execution from a database row', async () => {
			binaryDataRepository.findSourceByFileId.mockResolvedValue({
				sourceType: 'execution',
				sourceId: 'exec9',
			});
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf9']);
			executionRepository.existsForAccessibleWorkflows.mockResolvedValue(true);

			const result = await service.hasReadAccess(user, `database:${uuid}`);

			expect(result).toBe(true);
			expect(binaryDataRepository.findSourceByFileId).toHaveBeenCalledWith(uuid);
			expect(executionRepository.existsForAccessibleWorkflows).toHaveBeenCalledWith('exec9', [
				'wf9',
			]);
		});

		test('denies a database row that is not an execution', async () => {
			binaryDataRepository.findSourceByFileId.mockResolvedValue({
				sourceType: 'chat_message_attachment',
				sourceId: 'msg1',
			});

			expect(await service.hasReadAccess(user, `database:${uuid}`)).toBe(false);
			expect(workflowSharingService.getSharedWorkflowIds).not.toHaveBeenCalled();
			expect(executionRepository.existsForAccessibleWorkflows).not.toHaveBeenCalled();
		});

		test('denies a database row that is gone', async () => {
			binaryDataRepository.findSourceByFileId.mockResolvedValue(null);

			expect(await service.hasReadAccess(user, `database:${uuid}`)).toBe(false);
			expect(executionRepository.existsForAccessibleWorkflows).not.toHaveBeenCalled();
		});

		test('denies a custom (non-execution) path id', async () => {
			const id = `filesystem-v2:chat-hub/sessions/s1/messages/m1/binary_data/${uuid}`;

			expect(await service.hasReadAccess(user, id)).toBe(false);
			expect(workflowSharingService.getSharedWorkflowIds).not.toHaveBeenCalled();
			expect(executionRepository.existsForAccessibleWorkflows).not.toHaveBeenCalled();
		});

		// A trigger node writes its binary before the execution row exists, so the
		// path carries the literal `temp` where an execution id normally sits.
		describe('for a binary in the temp execution dir', () => {
			const tempId = `filesystem-v2:workflows/wf1/executions/temp/binary_data/${uuid}`;

			beforeEach(() => {
				// The execution id column is numeric, so a lookup by `temp` fails.
				executionRepository.existsForAccessibleWorkflows.mockRejectedValue(
					new Error('SQLITE_ERROR: no such column: NaN'),
				);
			});

			test('grants access from the workflow in the path, without an execution lookup', async () => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf1']);

				expect(await service.hasReadAccess(user, tempId)).toBe(true);
				expect(executionRepository.existsForAccessibleWorkflows).not.toHaveBeenCalled();
			});

			test('denies when the user cannot read the workflow in the path', async () => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf2']);

				expect(await service.hasReadAccess(user, tempId)).toBe(false);
			});

			test('denies a database row, which names no workflow to fall back on', async () => {
				binaryDataRepository.findSourceByFileId.mockResolvedValue({
					sourceType: 'execution',
					sourceId: 'temp',
				});

				expect(await service.hasReadAccess(user, `database:${uuid}`)).toBe(false);
				expect(executionRepository.existsForAccessibleWorkflows).not.toHaveBeenCalled();
			});
		});

		test('denies a malformed id without a mode separator', async () => {
			expect(await service.hasReadAccess(user, 'no-separator')).toBe(false);
			expect(workflowSharingService.getSharedWorkflowIds).not.toHaveBeenCalled();
		});
	});
});
