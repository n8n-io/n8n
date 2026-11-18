import type {
	RunWorkflowTestDto,
	WorkflowTestFile,
	WorkflowTestResult,
	WorkflowTestRunEvent,
	WorkflowTestRunResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { randomUUID } from 'node:crypto';

import { Push } from '@/push';

import type { WorkflowTestEntity } from './database/workflow-test.entity';
import { WorkflowTestRepository } from './database/workflow-test.repository';
import { WorkflowTestRunService } from './workflow-test-run.service';

type RunVersion = RunWorkflowTestDto['version'];

/**
 * Stores the test file of a workflow and runs it. A workflow has one file today.
 * The REST controller and the n8n Assistant both use this service.
 */
@Service()
export class WorkflowTestFileService {
	constructor(
		private readonly logger: Logger,
		private readonly repository: WorkflowTestRepository,
		private readonly runService: WorkflowTestRunService,
		private readonly push: Push,
	) {}

	async list(workflowId: string): Promise<WorkflowTestFile[]> {
		const rows = await this.repository.findByWorkflowId(workflowId, {});
		return rows.map(toWorkflowTestFile);
	}

	async get(workflowId: string): Promise<WorkflowTestFile | null> {
		const [file] = await this.list(workflowId);
		return file ?? null;
	}

	/** Creates the file of the workflow, or replaces its source. */
	async save(workflowId: string, source: string): Promise<WorkflowTestFile> {
		const [existing] = await this.repository.findByWorkflowId(workflowId, {});
		if (!existing) {
			return toWorkflowTestFile(await this.repository.insertFile(workflowId, source, {}));
		}
		if (existing.source !== source) {
			await this.repository.updateSource(existing.id, source, {});
		}
		const updated = await this.repository.findOne(workflowId, existing.id, {});
		return toWorkflowTestFile(updated ?? existing);
	}

	/**
	 * Starts a run of the stored file and returns at once. The events go to the
	 * user by push, and the result is stored as `lastRun`.
	 */
	async start(user: User, workflowId: string, id: string, version: RunVersion) {
		const file = await this.findFileOrFail(workflowId, id);
		const runId = randomUUID();
		void this.execute(user, file, runId, version).catch((error: unknown) =>
			this.logger.error('Failed to store the result of a workflow test run', {
				workflowId,
				runId,
				error: ensureError(error),
			}),
		);
		return { runId };
	}

	/**
	 * Runs the stored file and resolves with the result. The events also go to
	 * the user by push, so the Tests tab shows a run that the Assistant starts.
	 */
	async run(user: User, workflowId: string, id: string, version: RunVersion = 'draft') {
		const file = await this.findFileOrFail(workflowId, id);
		return await this.execute(user, file, randomUUID(), version);
	}

	private async execute(
		user: User,
		file: WorkflowTestEntity,
		runId: string,
		version: RunVersion,
	): Promise<WorkflowTestRunResult> {
		const tests: WorkflowTestResult[] = [];
		const finished = await this.runService.run(
			user,
			file.workflowId,
			{ source: file.source, version },
			(event: WorkflowTestRunEvent) => {
				if (event.type === 'testFinished') {
					const { type: _, ...result } = event;
					tests.push(result);
				}
				this.push.sendToUsers(
					{ type: 'workflowTestRunEvent', data: { runId, workflowId: file.workflowId, event } },
					[user.id],
				);
			},
		);

		const result: WorkflowTestRunResult = {
			runId,
			status: finished.status,
			errors: finished.errors,
			tests,
			finishedAt: new Date().toISOString(),
		};
		// A save during the run changes the source, so this result no longer describes the file.
		await this.repository.recordLastRun(file.id, file.source, result, {});
		return result;
	}

	private async findFileOrFail(workflowId: string, id: string) {
		const file = await this.repository.findOne(workflowId, id, {});
		if (!file) throw new NotFoundError(`Workflow test file "${id}" not found`);
		return file;
	}
}

function toWorkflowTestFile(row: WorkflowTestEntity): WorkflowTestFile {
	return {
		id: row.id,
		workflowId: row.workflowId,
		source: row.source,
		updatedAt: new Date(row.updatedAt).toISOString(),
		lastRun: row.lastRun ?? null,
	};
}
