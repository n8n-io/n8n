import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import {
	ExecutionRepository,
	UserRepository,
	WorkflowRepository,
	type User,
	type WorkflowEntity,
} from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { createDispatchReporter, type ClaimedTask } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import { ExecutionService } from '@/executions/execution.service';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';

import { ExecutionAutoRetryTaskHandler } from '../execution-auto-retry.task-handler';

const WORKFLOW_ID = 'workflow-1';
const EXECUTION_ID = '42';
const VERSION_ID = 'version-1';
const PUBLISHER_ID = 'publisher-1';

describe('ExecutionAutoRetryTaskHandler', () => {
	const executionRepository = mockInstance(ExecutionRepository);
	const workflowRepository = mockInstance(WorkflowRepository);
	const userRepository = mockInstance(UserRepository);
	const workflowPublisherService = mockInstance(WorkflowPublisherService);
	const executionService = mockInstance(ExecutionService);
	const provisioner = mockInstance(DurableJobProvisioner);
	const owner = new WorkflowScheduledJobOwner(mock());
	const handler = new ExecutionAutoRetryTaskHandler(
		mockLogger(),
		executionRepository,
		workflowRepository,
		userRepository,
		workflowPublisherService,
		executionService,
		provisioner,
		owner,
	);
	const report = createDispatchReporter(vi.fn());
	const task = mock<ClaimedTask>({
		id: 'task-1',
		jobId: 1,
		payload: { workflowId: WORKFLOW_ID, executionId: EXECUTION_ID },
	});
	const publisher = mock<User>({ id: PUBLISHER_ID });
	const ownJob = owner.member(WORKFLOW_ID, `auto-retry:${EXECUTION_ID}`);

	beforeEach(() => {
		vi.resetAllMocks();
		executionRepository.findRetryLink.mockResolvedValue({
			workflowId: WORKFLOW_ID,
			workflowVersionId: VERSION_ID,
			mode: 'trigger',
			retryOf: null,
			retrySuccessId: null,
		});
		workflowRepository.findById.mockResolvedValue(
			mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				activeVersionId: VERSION_ID,
				settings: { autoRetry: { enabled: true } },
			}),
		);
		workflowPublisherService.findPublisherUserIdForAccessCheck.mockResolvedValue(PUBLISHER_ID);
		userRepository.findByIdWithRole.mockResolvedValue(publisher);
		executionService.retry.mockReturnValue(new Promise(() => {}));
	});

	it('starts a retry of the payload execution as its publisher', async () => {
		const decision = await handler.execute(task, report);

		expect(decision).toBe(report.dispatched());
		expect(executionService.retry).toHaveBeenCalledWith({
			executionId: EXECUTION_ID,
			options: { loadWorkflow: false },
			sharedWorkflowIds: [WORKFLOW_ID],
			user: publisher,
		});
	});

	it('returns before the retry finishes', async () => {
		await expect(handler.execute(task, report)).resolves.toBe(report.dispatched());
	});

	const NO_START_CASES: Array<[string, () => void]> = [
		['the execution is gone', () => executionRepository.findRetryLink.mockResolvedValue(null)],
		[
			'the execution has no version',
			() =>
				executionRepository.findRetryLink.mockResolvedValue({
					workflowId: WORKFLOW_ID,
					workflowVersionId: null,
					mode: 'trigger',
					retryOf: null,
					retrySuccessId: null,
				}),
		],
		[
			'the workflow is not active',
			() =>
				workflowRepository.findById.mockResolvedValue(
					mock<WorkflowEntity>({
						activeVersionId: null,
						settings: { autoRetry: { enabled: true } },
					}),
				),
		],
		[
			'the setting is off',
			() =>
				workflowRepository.findById.mockResolvedValue(
					mock<WorkflowEntity>({ activeVersionId: VERSION_ID, settings: {} }),
				),
		],
		[
			'a retry of the execution already succeeded',
			() =>
				executionRepository.findRetryLink.mockResolvedValue({
					workflowId: WORKFLOW_ID,
					workflowVersionId: VERSION_ID,
					mode: 'trigger',
					retryOf: null,
					retrySuccessId: '43',
				}),
		],
		[
			'the version has no publisher',
			() => workflowPublisherService.findPublisherUserIdForAccessCheck.mockResolvedValue(undefined),
		],
	];

	it.each(NO_START_CASES)('starts no retry and deletes its job when %s', async (_name, arrange) => {
		arrange();

		await handler.execute(task, report);

		expect(provisioner.deprovisionOwnerMember).toHaveBeenCalledWith(ownJob);
	});

	it('keeps its job for the scheduler to try again when the publisher lookup fails', async () => {
		workflowPublisherService.findPublisherUserIdForAccessCheck.mockRejectedValue(
			new Error('connection reset'),
		);

		await expect(handler.execute(task, report)).rejects.toThrow('connection reset');

		expect(provisioner.deprovisionOwnerMember).not.toHaveBeenCalled();
	});

	it('deletes its job when the retry is refused', async () => {
		executionService.retry.mockRejectedValue(new ForbiddenError('ran as another user'));

		await handler.execute(task, report);

		await vi.waitFor(() => {
			expect(provisioner.deprovisionOwnerMember).toHaveBeenCalledWith(ownJob);
		});
	});
});
