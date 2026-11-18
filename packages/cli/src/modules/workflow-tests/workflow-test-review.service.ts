import {
	WORKFLOW_REVIEW_TESTS_MAX_FAILURES,
	type WorkflowReviewCheck,
	type WorkflowReviewTestsCompletedActivityData,
	type WorkflowTestFile,
	type WorkflowTestResult,
	type WorkflowTestRunResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { UserRepository, WorkflowReviewActivityRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { randomUUID } from 'node:crypto';

import { WorkflowReviewAuthorizationService } from '@/modules/workflow-reviews.ee/workflow-review-authorization.service';
import type {
	WorkflowReviewCheckProvider,
	WorkflowReviewCheckSubject,
} from '@/modules/workflow-reviews.ee/workflow-review-check.registry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowTestReviewRunEntity } from './database/workflow-test-review-run.entity';
import { WorkflowTestReviewRunRepository } from './database/workflow-test-review-run.repository';
import { WorkflowTestCallerService, type WorkflowCaller } from './workflow-test-caller.service';
import { WorkflowTestFileService } from './workflow-test-file.service';
import { WorkflowTestRunQueue } from './workflow-test-run-queue.service';
import { WorkflowTestRunService } from './workflow-test-run.service';

export const WORKFLOW_TESTS_CHECK_ID = 'workflow-tests';
export const WORKFLOW_CALLER_TESTS_CHECK_ID = 'workflow-caller-tests';

/** A run still marked as running after this time stopped without a result, for example on a restart. */
const STALE_RUN_MS = 10 * Time.minutes.toMilliseconds;

type ReviewPin = { workflowReviewRequestId: string; workflowId: string; workflowVersionId: string };

/**
 * A test file that runs for a review: the file of the reviewed workflow, or the
 * file of a workflow that calls it as a sub-workflow.
 */
type ReviewTarget = {
	testWorkflowId: string;
	caller?: WorkflowCaller;
	file: WorkflowTestFile;
};

/**
 * Runs the stored tests on the version that a review pins, when the review
 * opens or moves to a new version. For a sub-workflow, the tests of each
 * workflow that calls it run too. Each result goes to the activity feed, and
 * the review can be approved only after each of these runs passed.
 */
@Service()
export class WorkflowTestReviewService implements WorkflowReviewCheckProvider {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly runService: WorkflowTestRunService,
		private readonly runRepository: WorkflowTestReviewRunRepository,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly userRepository: UserRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly authorizationService: WorkflowReviewAuthorizationService,
		private readonly fileService: WorkflowTestFileService,
		private readonly callerService: WorkflowTestCallerService,
		private readonly queue: WorkflowTestRunQueue,
	) {}

	listenForReviews() {
		this.eventService.on('workflow-review-requested', (event) => this.onPinned(event));
		this.eventService.on('workflow-review-version-updated', (event) => this.onPinned(event));
	}

	async getChecks(viewer: User, subject: WorkflowReviewCheckSubject) {
		const checks = await Promise.all(
			subject.workflows.map(async ({ workflowId, workflowVersionId }) => {
				const targets = await this.findTargets(workflowId);
				return await Promise.all(
					targets.map(
						async (target) =>
							await this.getCheck(viewer, subject.workflowReviewRequestId, target, {
								workflowId,
								workflowVersionId,
							}),
					),
				);
			}),
		);
		return checks.flat();
	}

	/** Runs the tests again on each pinned version of an open review. */
	async rerun(user: User, workflowReviewRequestId: string) {
		const { request, workflowRows } = await this.authorizationService.findReadableRequestOrFail(
			user,
			workflowReviewRequestId,
		);
		if (request.state !== 'open') {
			throw new ConflictError('The review request is no longer open');
		}

		let started = 0;
		for (const { workflowId, workflowVersionId } of workflowRows) {
			if (workflowVersionId === null) continue;
			const targets = await this.findTargets(workflowId);
			for (const target of targets) {
				this.startInBackground(user, target, {
					workflowReviewRequestId,
					workflowId,
					workflowVersionId,
				});
			}
			started += targets.length;
		}
		return { started };
	}

	/** The reviewed workflow's own test file first, then the files of its callers. */
	private async findTargets(workflowId: string): Promise<ReviewTarget[]> {
		const [own, callers] = await Promise.all([
			this.fileService.get(workflowId),
			this.callerService.findCallersWithTests(workflowId),
		]);
		return [
			...(own ? [{ testWorkflowId: workflowId, file: own }] : []),
			...callers.map(({ file, ...caller }) => ({
				testWorkflowId: caller.workflowId,
				caller,
				file,
			})),
		];
	}

	private onPinned(event: { user: { id: string } } & ReviewPin) {
		const { workflowReviewRequestId, workflowId, workflowVersionId } = event;
		void this.runForRequester(event.user.id, {
			workflowReviewRequestId,
			workflowId,
			workflowVersionId,
		}).catch((error: unknown) =>
			this.logger.error('Failed to run the workflow tests for a review', {
				workflowReviewRequestId,
				error: ensureError(error),
			}),
		);
	}

	/**
	 * The runner runs the test code on the n8n host, so the tests run at once only
	 * for a requester who can run tests. Otherwise the checks wait for an owner or
	 * admin to start them.
	 */
	private async runForRequester(userId: string, pin: ReviewPin) {
		const targets = await this.findTargets(pin.workflowId);
		if (targets.length === 0) return;

		const [user] = await this.userRepository.findManyByIds([userId], { includeRole: true });
		if (!user || !canRunTests(user)) return;

		for (const target of targets) this.startInBackground(user, target, pin);
	}

	private startInBackground(user: User, target: ReviewTarget, pin: ReviewPin) {
		void this.execute(user, target, pin).catch((error: unknown) =>
			this.logger.error('Failed to run the workflow tests for a review', {
				workflowReviewRequestId: pin.workflowReviewRequestId,
				testWorkflowId: target.testWorkflowId,
				error: ensureError(error),
			}),
		);
	}

	private async execute(user: User, target: ReviewTarget, pin: ReviewPin) {
		// The row exists before the run waits in the queue, so the check shows it as running.
		const run = await this.runRepository.startRun(
			{ ...pin, testWorkflowId: target.testWorkflowId },
			{},
		);
		// `runService.run` never rejects. The version lookup can, and its error is the result.
		const result = await this.queue
			.add(async () => await this.runOnPinnedVersion(user, target, pin))
			.catch((error: unknown) => errorResult(ensureError(error).message));
		await this.runRepository.finishRun(run.id, result.status, result, {});

		await this.activityRepository.createActivity(
			{
				workflowReviewRequestId: pin.workflowReviewRequestId,
				type: 'tests.completed',
				data: toActivityData(pin, target, result),
				// n8n runs the tests, so the entry has no author.
				createdById: null,
			},
			{},
		);
	}

	/**
	 * The runner exports the draft or the published version of every workflow in
	 * the package. The pinned version is one of them in the usual case: a review
	 * pins the draft that the author saved. A caller's package holds the pinned
	 * sub-workflow at the same choice.
	 */
	private async runOnPinnedVersion(
		user: User,
		target: ReviewTarget,
		pin: ReviewPin,
	): Promise<WorkflowTestRunResult> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(pin.workflowId, user, [
			'workflow:read',
		]);
		const version =
			workflow?.versionId === pin.workflowVersionId
				? 'draft'
				: workflow?.activeVersionId === pin.workflowVersionId
					? 'published'
					: null;
		if (version === null) {
			return errorResult(
				'The version under review is no longer the draft or the published version, so the tests cannot run on it. Update the review to the current version.',
			);
		}

		const tests: WorkflowTestResult[] = [];
		const finished = await this.runService.run(
			user,
			target.testWorkflowId,
			{ source: target.file.source, version },
			(event) => {
				if (event.type !== 'testFinished') return;
				const { type: _, ...result } = event;
				tests.push(result);
			},
		);
		return {
			runId: randomUUID(),
			status: finished.status,
			errors: finished.errors,
			tests,
			finishedAt: new Date().toISOString(),
		};
	}

	private async getCheck(
		viewer: User,
		workflowReviewRequestId: string,
		target: ReviewTarget,
		pinned: { workflowId: string; workflowVersionId: string | null },
	): Promise<WorkflowReviewCheck> {
		const run = await this.runRepository.findLatest(
			{
				workflowReviewRequestId,
				workflowId: pinned.workflowId,
				testWorkflowId: target.testWorkflowId,
			},
			{},
		);
		const check: WorkflowReviewCheck = {
			id: target.caller ? WORKFLOW_CALLER_TESTS_CHECK_ID : WORKFLOW_TESTS_CHECK_ID,
			workflowId: pinned.workflowId,
			workflowVersionId: pinned.workflowVersionId,
			testWorkflowId: target.testWorkflowId,
			testWorkflowName: target.caller ? await this.readableName(viewer, target.caller) : null,
			status: 'pending',
			counts: null,
			message: null,
			viewerCanRun: canRunTests(viewer),
		};

		// A run on another version, or on an older test file, says nothing about this pin.
		if (
			!run ||
			run.workflowVersionId !== pinned.workflowVersionId ||
			isOlderThanFile(run, target.file)
		) {
			return check;
		}

		if (run.status === 'running') {
			const stale = Date.now() - new Date(run.createdAt).getTime() > STALE_RUN_MS;
			return stale
				? { ...check, status: 'error', message: 'The test run stopped without a result' }
				: { ...check, status: 'running' };
		}

		return {
			...check,
			status: run.status,
			counts: run.result ? countTests(run.result.tests) : null,
			message: run.result?.errors[0] ?? null,
		};
	}

	/** The gate counts every caller, but only a caller that the viewer can read shows its name. */
	private async readableName(viewer: User, caller: WorkflowCaller) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			caller.workflowId,
			viewer,
			['workflow:read'],
		);
		return workflow ? caller.name : null;
	}
}

function canRunTests(user: User) {
	return hasGlobalScope(user, 'workflow:execute');
}

function isOlderThanFile(run: WorkflowTestReviewRunEntity, file: WorkflowTestFile) {
	return new Date(file.updatedAt).getTime() > new Date(run.createdAt).getTime();
}

function errorResult(message: string): WorkflowTestRunResult {
	return {
		runId: randomUUID(),
		status: 'error',
		errors: [message],
		tests: [],
		finishedAt: new Date().toISOString(),
	};
}

function countTests(tests: WorkflowTestResult[]) {
	const count = (status: WorkflowTestResult['status']) =>
		tests.filter((test) => test.status === status).length;
	return {
		passed: count('passed'),
		failed: count('failed'),
		skipped: count('skipped'),
		total: tests.length,
	};
}

function toActivityData(
	pin: ReviewPin,
	target: ReviewTarget,
	result: WorkflowTestRunResult,
): WorkflowReviewTestsCompletedActivityData {
	return {
		workflowId: pin.workflowId,
		workflowVersionId: pin.workflowVersionId,
		...(target.caller ? { caller: target.caller } : {}),
		status: result.status,
		...countTests(result.tests),
		failures: result.tests
			.filter((test) => test.status === 'failed')
			.slice(0, WORKFLOW_REVIEW_TESTS_MAX_FAILURES)
			.map((test) => ({ name: test.name, message: test.error?.message ?? '' })),
		errors: result.errors,
	};
}
