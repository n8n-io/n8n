import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError, type IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
<<<<<<< HEAD
=======
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ResumeAttemptService } from '@/executions/resume-attempt.service';
>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import { shouldRestartParentExecution } from './workflow-helpers';

@Service()
export class WaitTracker {
	private waitingExecutions: {
		[key: string]: {
			executionId: string;
			timer: NodeJS.Timeout;
		};
	} = {};

	mainTimer: NodeJS.Timeout;

<<<<<<< HEAD
=======
	private readonly resuming = new Set<string>();

	private resumingParkedParents = false;

>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly ownershipService: OwnershipService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly instanceSettings: InstanceSettings,
		private readonly resumeAttemptService: ResumeAttemptService,
	) {
		this.logger = this.logger.scoped('waiting-executions');
	}

	has(executionId: string) {
		return this.waitingExecutions[executionId] !== undefined;
	}

	init() {
		if (this.instanceSettings.isLeader) this.startTracking();
	}

	@OnLeaderTakeover()
	private startTracking() {
		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);

		void this.getWaitingExecutions();

		this.logger.debug('Started tracking waiting executions');
	}

	async getWaitingExecutions() {
		this.logger.debug('Querying database for waiting executions');

		const executions = await this.executionRepository.getWaitingExecutions();

		if (executions.length === 0) {
			return;
		}

		const executionIds = executions.map((execution) => execution.id).join(', ');
		this.logger.debug(
			`Found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
		);

		// Add timers for each waiting execution that they get started at the correct time

		for (const execution of executions) {
			const executionId = execution.id;
			if (this.waitingExecutions[executionId] === undefined) {
				const triggerTime = execution.waitTill!.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						void this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}

	stopExecution(executionId: string) {
		if (!this.waitingExecutions[executionId]) return;

		clearTimeout(this.waitingExecutions[executionId].timer);

		delete this.waitingExecutions[executionId];
	}

	async startExecution(executionId: string) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		// A poll can find the row still `waiting` while this process resumes it. A second
		// resume would double the memory in use and consume a second attempt.
		if (this.resuming.has(executionId)) throw new ExecutionAlreadyResumingError(executionId);
		this.resuming.add(executionId);
		try {
			await this.resumeExecution(executionId);
		} finally {
			this.resuming.delete(executionId);
		}
	}

	private async resumeExecution(executionId: string) {
		const claim = await this.resumeAttemptService.claim(executionId, 'waiting');
		if (!claim.granted) return;

		try {
			await this.loadAndRun(executionId);
		} catch (error) {
			// The next poll retries a resume that throws, so it must not count toward the limit
			await this.resumeAttemptService.release(executionId, 'waiting', claim.attempt);
			throw error;
		}
	}

	private async loadAndRun(executionId: string) {
		// Get the data to execute
		const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!fullExecutionData) {
			throw new UnexpectedError('Execution does not exist.', { extra: { executionId } });
		}
		if (fullExecutionData.finished) {
			throw new UnexpectedError('The execution did succeed and can so not be started again.');
		}

		if (!fullExecutionData.workflowData.id) {
			throw new UnexpectedError('Only saved workflows can be resumed.');
		}

		const workflowId = fullExecutionData.workflowData.id;
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

		const data: IWorkflowExecutionDataProcess = {
			executionMode: fullExecutionData.mode,
			executionData: fullExecutionData.data,
			workflowData: fullExecutionData.workflowData,
			projectId: project.id,
			pushRef: fullExecutionData.data.pushRef,
			startedAt: fullExecutionData.startedAt,
		};

		// Start the execution again
		await this.workflowRunner.run(data, false, false, executionId);

		const { parentExecution } = fullExecutionData.data;
		if (shouldRestartParentExecution(parentExecution)) {
			// on child execution completion, resume parent execution
			void this.activeExecutions.getPostExecutePromise(executionId).then(() => {
				void this.startExecution(parentExecution.executionId);
			});
		}
	}

<<<<<<< HEAD
=======
	/** Patch the parent's stack with the child's results, reporting whether the patch landed. */
	private async patchParent(
		parentExecutionId: string,
		subworkflowResults: IRun,
		childExecution?: RelatedExecution,
		childWorkflowData?: IWorkflowBase,
	): Promise<boolean> {
		let patched = false;

		await this.withRetry(
			async () => {
				patched = await updateParentExecutionWithChildResults(
					parentExecutionId,
					subworkflowResults,
					childExecution,
					childWorkflowData,
				);
			},
			MAX_PARENT_RESUME_ATTEMPTS,
			isRetryableResumeError,
		);

		return patched;
	}

	/**
	 * Claim the parent so it resumes. When the claim fails the parent is either already
	 * claimed by a sibling, or not parked yet; in the latter case
	 * `resumeParentsOfFinishedSubExecutions` picks it up on the next tick.
	 */
	private async claimParent(
		parentExecutionId: string,
		childExecution?: RelatedExecution,
	): Promise<void> {
		try {
			await this.withRetry(
				async () => await this.startExecution(parentExecutionId),
				MAX_PARENT_RESUME_ATTEMPTS,
				(error) =>
					!(error instanceof ExecutionAlreadyResumingError) && isRetryableResumeError(error),
			);
		} catch (error) {
			if (error instanceof ExecutionAlreadyResumingError) {
				this.logger.info(
					'Parent execution not claimable: already claimed by another process, or not parked yet',
					{ parentExecutionId, childExecutionId: childExecution?.executionId },
				);
				return;
			}
			throw error;
		}
	}

	/**
	 * Resume parents parked on a sub-execution whose child has since finished. A child that
	 * finishes before its parent's row reaches `waiting` cannot patch or claim it, and the
	 * parent then parks at `WAIT_FOR_SUB_EXECUTION`, which `getWaitingExecutions` never
	 * selects. This sweep runs on the leader's tick and closes that gap.
	 */
	async resumeParentsOfFinishedSubExecutions() {
		// A sweep that runs longer than the tick would otherwise be joined by the next one,
		// walking the same parents again.
		if (this.resumingParkedParents) {
			this.logger.debug('Still sweeping parents parked on a sub-execution, skipping this tick');
			return;
		}

		this.resumingParkedParents = true;
		try {
			let parentIds: string[];
			try {
				parentIds = await this.executionRepository.findParkedOnSubExecution();
			} catch (error) {
				this.logger.error('Failed to query executions parked on a sub-execution', {
					error: ensureError(error).message,
				});
				return;
			}

			for (const parentId of parentIds) {
				try {
					await this.resumeParentIfChildFinished(parentId);
				} catch (error) {
					this.logger.error('Failed to resume parent execution parked on a sub-execution', {
						parentExecutionId: parentId,
						error: ensureError(error).message,
					});
				}
			}
		} finally {
			this.resumingParkedParents = false;
		}
	}

	private async resumeParentIfChildFinished(parentId: string) {
		// The child-completion callback may be resuming this parent under the same guard, so
		// the inspection must not count a second attempt on top of that resume.
		if (this.resuming.has(parentId)) return;
		this.resuming.add(parentId);

		let childExecution: RelatedExecution | undefined;
		try {
			// The inspection loads the parent's full run data, so it counts as an attempt until
			// it ends. The resume that may follow counts its own.
			const claim = await this.resumeAttemptService.claim(parentId, 'waiting');
			if (!claim.granted) return;

			try {
				childExecution = await this.patchParentWithFinishedChild(parentId);
			} finally {
				await this.resumeAttemptService.release(parentId, 'waiting', claim.attempt);
			}
		} finally {
			this.resuming.delete(parentId);
		}

		if (childExecution) await this.claimParent(parentId, childExecution);
	}

	/** Patch the parent with its finished child's result. Returns the child when patched. */
	private async patchParentWithFinishedChild(
		parentId: string,
	): Promise<RelatedExecution | undefined> {
		const parent = await this.executionPersistence.findSingleExecution(parentId, {
			includeData: true,
			unflattenData: true,
		});
		const childIds =
			parent?.data.executionData?.nodeExecutionStack[0]?.metadata?.waitingChildExecutionIds;
		if (!childIds?.length) return;

		const statuses = await this.executionRepository.findStatusesByIds(childIds);
		const missing = childIds.filter((id) => !statuses.some((row) => row.id === id));
		if (missing.length > 0) {
			this.logger.warn('Parent execution waits on sub-executions that no longer exist', {
				parentExecutionId: parentId,
				childExecutionIds: missing,
			});
		}

		const finished = statuses.find((row) => isTerminalExecutionStatus(row.status));
		if (!finished) return;

		const child = await this.executionPersistence.findSingleExecution(finished.id, {
			includeData: true,
			unflattenData: true,
		});
		if (!child) {
			this.logger.warn('Finished sub-execution no longer exists', {
				parentExecutionId: parentId,
				childExecutionId: finished.id,
			});
			return;
		}

		const childRun: IRun = {
			data: child.data,
			mode: child.mode,
			startedAt: child.startedAt,
			stoppedAt: child.stoppedAt,
			status: child.status,
			// oxlint-disable-next-line typescript/no-deprecated
			finished: child.finished,
			storedAt: child.storedAt,
		};

		const childExecution = { executionId: child.id, workflowId: child.workflowId };

		// A crashed or cancelled child is terminal but often carries neither an error nor node
		// output. Resuming on it would re-run the parent's node disabled, passing the parent's
		// own input off as the sub-workflow's result, so leave the parent parked instead.
		if (!(await this.patchParent(parentId, childRun, childExecution, child.workflowData))) {
			this.logger.warn('Parent not patched with the sub-execution result, leaving it parked', {
				parentExecutionId: parentId,
				childExecutionId: child.id,
				childStatus: child.status,
			});
			return;
		}

		return childExecution;
	}

	/**
	 * Run an operation up to `maxAttempts` times with exponential backoff, rethrowing the
	 * last error if they all fail. An error rejected by `shouldRetry` is rethrown at once.
	 */
	private async withRetry(
		operation: () => Promise<void>,
		maxAttempts: number,
		shouldRetry: (error: unknown) => boolean = () => true,
	): Promise<void> {
		for (let attempt = 1; ; attempt++) {
			try {
				await operation();
				return;
			} catch (error) {
				if (attempt >= maxAttempts || !shouldRetry(error)) throw error;
				await sleep(100 * 2 ** (attempt - 1));
			}
		}
	}

>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
	@OnLeaderStepdown()
	stopTracking() {
		if (!this.mainTimer) return;

		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});

		this.logger.debug('Stopped tracking waiting executions');
	}
}
