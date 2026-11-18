import type { RunWorkflowTestDto, WorkflowTestRunEvent } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	CredentialExportPolicy,
	ExportDependencyPolicy,
	ExportVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { Push } from '@/push';

import { WorkflowTestsConfig } from './workflow-tests.config';

const RUN_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds;
const STDERR_TAIL_LENGTH = 4_000;

const VERSION_POLICIES = {
	draft: ExportVersionPolicy.Latest,
	published: ExportVersionPolicy.PublishedStrict,
} as const;

type RunFinishedEvent = Extract<WorkflowTestRunEvent, { type: 'runFinished' }>;
type OnRunEvent = (event: WorkflowTestRunEvent) => void;

@Service()
export class WorkflowTestRunService {
	constructor(
		private readonly config: WorkflowTestsConfig,
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly push: Push,
	) {}

	start(user: User, workflowId: string, request: RunWorkflowTestDto) {
		const runId = randomUUID();
		void this.run(user, workflowId, request, (event) =>
			this.push.sendToUsers({ type: 'workflowTestRunEvent', data: { runId, workflowId, event } }, [
				user.id,
			]),
		);
		return { runId };
	}

	/** Calls `onEvent` for each event and resolves with the `runFinished` event. Never rejects. */
	async run(
		user: User,
		workflowId: string,
		{ source, version }: RunWorkflowTestDto,
		onEvent: OnRunEvent,
	): Promise<RunFinishedEvent> {
		try {
			return await this.runInTemporaryDirectory(user, workflowId, source, version, onEvent);
		} catch (error) {
			const event: RunFinishedEvent = {
				type: 'runFinished',
				status: 'error',
				errors: [ensureError(error).message],
			};
			onEvent(event);
			return event;
		}
	}

	private async runInTemporaryDirectory(
		user: User,
		workflowId: string,
		source: string,
		version: RunWorkflowTestDto['version'],
		onEvent: OnRunEvent,
	) {
		const directory = await mkdtemp(path.join(tmpdir(), 'n8n-workflow-test-'));
		try {
			await this.exportPackage(user, workflowId, version, path.join(directory, 'package'));
			await writeFile(path.join(directory, 'workflow.test.ts'), source);
			return await this.runVitest(directory, onEvent);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}

	private async exportPackage(
		user: User,
		workflowId: string,
		version: RunWorkflowTestDto['version'],
		targetDir: string,
	) {
		await this.n8nPackagesService.exportPackageToDirectory(
			{
				user,
				workflowIds: [workflowId],
				dependencyPolicy: ExportDependencyPolicy.IncludeInPackage,
				versionPolicy: VERSION_POLICIES[version],
				credentialExportPolicy: CredentialExportPolicy.NoValues,
				includeVariableValues: false,
			},
			{ targetDir },
		);
	}

	private async runVitest(directory: string, onEvent: OnRunEvent): Promise<RunFinishedEvent> {
		if (!this.config.packageDir) {
			throw new OperationalError('N8N_WORKFLOW_TESTS_PACKAGE_DIR is not set');
		}

		const child = fork(path.join(this.config.packageDir, 'dist/runner/run-tests.js'), [directory], {
			cwd: directory,
			// Without it, the n8n backend that @n8n/test loads writes to the host user's ~/.n8n.
			env: { N8N_USER_FOLDER: path.join(directory, '.n8n') },
			stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
			timeout: RUN_TIMEOUT_MS,
			killSignal: 'SIGKILL',
		});

		let finished: RunFinishedEvent | undefined;
		let stderr = '';
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_LENGTH);
		});
		child.on('message', (event) => {
			if (!isRunEvent(event)) return;
			if (event.type === 'runFinished') finished = event;
			onEvent(event);
		});

		const { code, signal } = await new Promise<{ code: number | null; signal: string | null }>(
			(resolve, reject) => {
				child.on('error', reject);
				child.on('close', (code, signal) => resolve({ code, signal }));
			},
		);
		if (finished) return finished;

		const reason =
			signal === 'SIGKILL' ? 'The test run timed out' : `The test runner exited with code ${code}`;
		throw new OperationalError(`${reason}. ${stderr}`.trim());
	}
}

const RUN_EVENT_TYPES = new Set<unknown>([
	'runStarted',
	'testStarted',
	'testFinished',
	'runFinished',
]);

function isRunEvent(value: unknown): value is WorkflowTestRunEvent {
	return isRecord(value) && RUN_EVENT_TYPES.has(value.type);
}
