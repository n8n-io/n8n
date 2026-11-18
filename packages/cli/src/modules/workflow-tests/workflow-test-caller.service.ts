import type { WorkflowTestCallers, WorkflowTestFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowDependencyRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowTestFileService } from './workflow-test-file.service';
import { WorkflowTestRunQueue } from './workflow-test-run-queue.service';

export type WorkflowCaller = { workflowId: string; name: string };
export type WorkflowCallerWithTests = WorkflowCaller & { file: WorkflowTestFile };

/**
 * Finds the workflows that call a workflow as a sub-workflow, and runs their
 * tests. A change to a sub-workflow can break its callers, so their tests are
 * the regression check of the change.
 */
@Service()
export class WorkflowTestCallerService {
	/** Callers whose run is queued or in progress, by workflow id. */
	private readonly active = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly fileService: WorkflowTestFileService,
		private readonly queue: WorkflowTestRunQueue,
	) {}

	/**
	 * Every workflow that calls this one from its draft or its published version,
	 * whoever can read it. Archived callers and calls through an expression are not
	 * included: the dependency index holds only static workflow ids.
	 */
	async findCallers(workflowId: string): Promise<WorkflowCaller[]> {
		const rows = await this.dependencyRepository.findDependenciesForResources(
			[workflowId],
			['workflowCall'],
			false,
		);
		const callerIds = [...new Set(rows.map((row) => row.workflowId))].filter(
			(id) => id !== workflowId,
		);
		const workflows = await this.workflowRepository.findByIds(callerIds, {
			fields: ['name', 'isArchived'],
		});
		return workflows
			.filter((workflow) => !workflow.isArchived)
			.map((workflow) => ({ workflowId: workflow.id, name: workflow.name }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	async findCallersWithTests(workflowId: string): Promise<WorkflowCallerWithTests[]> {
		const callers = await this.findCallers(workflowId);
		const withFiles = await Promise.all(
			callers.map(async (caller) => ({
				...caller,
				file: await this.fileService.get(caller.workflowId),
			})),
		);
		return withFiles.flatMap(({ file, ...caller }) => (file ? [{ ...caller, file }] : []));
	}

	/** The callers that the user can read, with the state of their tests. */
	async listForUser(user: User, workflowId: string): Promise<WorkflowTestCallers> {
		const callers = await this.findCallers(workflowId);
		const readable = await this.filterReadable(user, callers);

		return {
			callers: await Promise.all(
				readable.map(async (caller) => {
					const file = await this.fileService.get(caller.workflowId);
					return {
						...caller,
						testFileId: file?.id ?? null,
						running: this.active.has(caller.workflowId),
						lastRun: file?.lastRun ?? null,
					};
				}),
			),
			inaccessibleCount: callers.length - readable.length,
		};
	}

	/**
	 * Starts the tests of each caller that has tests, on the drafts. The draft of
	 * the sub-workflow is in each caller's package. Each result is stored as the
	 * caller's `lastRun`, and its events go to the user by push.
	 */
	async startForUser(user: User, workflowId: string) {
		const callers = await this.filterReadable(user, await this.findCallersWithTests(workflowId));
		const toStart = callers.filter((caller) => !this.active.has(caller.workflowId));

		for (const caller of toStart) {
			this.active.add(caller.workflowId);
			void this.queue
				.add(async () => await this.fileService.run(user, caller.workflowId, caller.file.id))
				.catch((error: unknown) =>
					this.logger.error('Failed to run the tests of a caller workflow', {
						workflowId: caller.workflowId,
						error: ensureError(error),
					}),
				)
				.finally(() => this.active.delete(caller.workflowId));
		}

		return { started: toStart.map(({ workflowId }) => workflowId) };
	}

	private async filterReadable<T extends WorkflowCaller>(user: User, callers: T[]): Promise<T[]> {
		const readable = await Promise.all(
			callers.map(
				async (caller) =>
					(await this.workflowFinderService.findWorkflowForUser(caller.workflowId, user, [
						'workflow:read',
					])) !== null,
			),
		);
		return callers.filter((_, index) => readable[index]);
	}
}
