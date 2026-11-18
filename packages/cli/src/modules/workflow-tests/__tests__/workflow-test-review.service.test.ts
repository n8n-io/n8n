import type { WorkflowTestFile, WorkflowTestRunEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type {
	User,
	UserRepository,
	WorkflowEntity,
	WorkflowReviewActivityRepository,
} from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { WorkflowReviewAuthorizationService } from '@/modules/workflow-reviews.ee/workflow-review-authorization.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowTestReviewRunEntity } from '../database/workflow-test-review-run.entity';
import type { WorkflowTestReviewRunRepository } from '../database/workflow-test-review-run.repository';
import type { WorkflowTestFileService } from '../workflow-test-file.service';
import { WorkflowTestReviewService } from '../workflow-test-review.service';
import type { WorkflowTestRunService } from '../workflow-test-run.service';

const userWithScopes = (id: string, scopes: Scope[]): User =>
	mock<User>({ id, role: { slug: 'test', scopes: scopes.map((slug) => ({ slug })) } });
const owner = userWithScopes('owner-1', ['workflow:execute']);
const member = userWithScopes('member-1', []);

const file: WorkflowTestFile = {
	id: 'file-1',
	workflowId: 'wf-1',
	source: "test('a', () => {});",
	updatedAt: '2026-11-18T10:00:00.000Z',
	lastRun: null,
};

const pin = {
	workflowReviewRequestId: 'req-1',
	workflowId: 'wf-1',
	workflowVersionId: 'ver-2',
};

describe('WorkflowTestReviewService', () => {
	const eventService = new EventService();
	const fileService = mock<WorkflowTestFileService>();
	const runService = mock<WorkflowTestRunService>();
	const runRepository = mock<WorkflowTestReviewRunRepository>();
	const activityRepository = mock<WorkflowReviewActivityRepository>();
	const userRepository = mock<UserRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();

	const service = new WorkflowTestReviewService(
		mock<Logger>(),
		eventService,
		fileService,
		runService,
		runRepository,
		activityRepository,
		userRepository,
		workflowFinderService,
		mock<WorkflowReviewAuthorizationService>(),
	);
	service.listenForReviews();

	// A plain object, not a deep mock: the service reads `result.errors[0]`, which a proxy answers.
	const run = (overrides: Partial<WorkflowTestReviewRunEntity>) =>
		({
			id: 'run-1',
			workflowVersionId: 'ver-2',
			status: 'passed',
			result: null,
			createdAt: new Date('2026-11-18T11:00:00.000Z'),
			...overrides,
		}) as WorkflowTestReviewRunEntity;

	const subject = {
		workflowReviewRequestId: 'req-1',
		workflows: [{ workflowId: 'wf-1', workflowVersionId: 'ver-2' }],
	};

	beforeEach(() => {
		vi.resetAllMocks();
		fileService.get.mockResolvedValue(file);
		runRepository.startRun.mockResolvedValue(run({ status: 'running' }));
	});

	describe('getChecks', () => {
		it('returns no check for a workflow without tests', async () => {
			fileService.get.mockResolvedValue(null);

			expect(await service.getChecks(owner, subject)).toEqual([]);
		});

		it.each([
			['no run', null],
			['a run on another version', run({ workflowVersionId: 'ver-1' })],
			['a run older than the test file', run({ createdAt: new Date('2026-11-18T09:00:00.000Z') })],
		])('is pending with %s', async (_name, latest) => {
			runRepository.findLatest.mockResolvedValue(latest);

			const [check] = await service.getChecks(member, subject);

			expect(check).toMatchObject({ status: 'pending', viewerCanRun: false });
		});

		it('reports the counts of a passed run on the pinned version', async () => {
			runRepository.findLatest.mockResolvedValue(
				run({
					result: {
						runId: 'r',
						status: 'passed',
						errors: [],
						finishedAt: '',
						tests: [
							{ name: 'a', status: 'passed', durationMs: 1 },
							{ name: 'b', status: 'skipped', durationMs: 0 },
						],
					},
				}),
			);

			const [check] = await service.getChecks(owner, subject);

			expect(check).toEqual({
				id: 'workflow-tests',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-2',
				status: 'passed',
				counts: { passed: 1, failed: 0, skipped: 1, total: 2 },
				message: null,
				viewerCanRun: true,
			});
		});

		it('treats a run that stopped without a result as an error', async () => {
			runRepository.findLatest.mockResolvedValue(
				run({ status: 'running', createdAt: new Date(Date.now() - 60 * 60 * 1000) }),
			);

			const [check] = await service.getChecks(owner, subject);

			expect(check?.status).toBe('error');
		});
	});

	describe('when a review pins a version', () => {
		const emitPin = (user: User) =>
			eventService.emit('workflow-review-version-updated', { user, ...pin });

		const waitForActivity = async () =>
			await vi.waitFor(() => expect(activityRepository.createActivity).toHaveBeenCalled());

		it('runs the tests on the pinned draft and writes the result to the feed', async () => {
			userRepository.findManyByIds.mockResolvedValue([owner]);
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ versionId: 'ver-2', activeVersionId: 'ver-1' }),
			);
			runService.run.mockImplementation(async (_user, _workflowId, _request, onEvent) => {
				const events: WorkflowTestRunEvent[] = [
					{ type: 'testFinished', name: 'a', status: 'passed', durationMs: 1 },
					{
						type: 'testFinished',
						name: 'routing > b',
						status: 'failed',
						durationMs: 1,
						error: { message: 'expected 1 to be 2' },
					},
				];
				events.forEach(onEvent);
				return { type: 'runFinished', status: 'failed', errors: [] };
			});

			emitPin(owner);
			await waitForActivity();

			expect(runService.run).toHaveBeenCalledWith(
				owner,
				'wf-1',
				{ source: file.source, version: 'draft' },
				expect.any(Function),
			);
			expect(runRepository.finishRun).toHaveBeenCalledWith(
				'run-1',
				'failed',
				expect.objectContaining({ status: 'failed' }),
				{},
			);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				{
					workflowReviewRequestId: 'req-1',
					type: 'tests.completed',
					data: {
						workflowId: 'wf-1',
						workflowVersionId: 'ver-2',
						status: 'failed',
						passed: 1,
						failed: 1,
						skipped: 0,
						total: 2,
						failures: [{ name: 'routing > b', message: 'expected 1 to be 2' }],
						errors: [],
					},
					createdById: null,
				},
				{},
			);
		});

		it('records an error when the pinned version is neither the draft nor published', async () => {
			userRepository.findManyByIds.mockResolvedValue([owner]);
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ versionId: 'ver-3', activeVersionId: 'ver-1' }),
			);

			emitPin(owner);
			await waitForActivity();

			expect(runService.run).not.toHaveBeenCalled();
			expect(runRepository.finishRun).toHaveBeenCalledWith('run-1', 'error', expect.anything(), {});
		});

		it('waits for an owner or admin when the requester cannot run tests', async () => {
			userRepository.findManyByIds.mockResolvedValue([member]);

			emitPin(member);
			await vi.waitFor(() => expect(userRepository.findManyByIds).toHaveBeenCalled());

			expect(runRepository.startRun).not.toHaveBeenCalled();
			expect(runService.run).not.toHaveBeenCalled();
		});
	});
});
