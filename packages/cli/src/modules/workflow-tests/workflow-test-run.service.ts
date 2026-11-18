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

interface TestRun {
	runId: string;
	workflowId: string;
	user: User;
}

@Service()
export class WorkflowTestRunService {
	constructor(
		private readonly config: WorkflowTestsConfig,
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly push: Push,
	) {}

	start(user: User, workflowId: string, { source, version }: RunWorkflowTestDto) {
		const run: TestRun = { runId: randomUUID(), workflowId, user };
		void this.execute(run, source, version);
		return { runId: run.runId };
	}

	private async execute(run: TestRun, source: string, version: RunWorkflowTestDto['version']) {
		try {
			await this.runInTemporaryDirectory(run, source, version);
		} catch (error) {
			this.send(run, {
				type: 'runFinished',
				status: 'error',
				errors: [ensureError(error).message],
			});
		}
	}

	private async runInTemporaryDirectory(
		run: TestRun,
		source: string,
		version: RunWorkflowTestDto['version'],
	) {
		const directory = await mkdtemp(path.join(tmpdir(), 'n8n-workflow-test-'));
		try {
			await this.exportPackage(run, version, path.join(directory, 'package'));
			await writeFile(path.join(directory, 'workflow.test.ts'), source);
			await this.runVitest(directory, (event) => this.send(run, event));
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}

	private async exportPackage(
		{ user, workflowId }: TestRun,
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

	private async runVitest(directory: string, onEvent: (event: WorkflowTestRunEvent) => void) {
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

		let finished = false;
		let stderr = '';
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_LENGTH);
		});
		child.on('message', (event) => {
			if (!isRunEvent(event)) return;
			if (event.type === 'runFinished') finished = true;
			onEvent(event);
		});

		const { code, signal } = await new Promise<{ code: number | null; signal: string | null }>(
			(resolve, reject) => {
				child.on('error', reject);
				child.on('close', (code, signal) => resolve({ code, signal }));
			},
		);
		if (finished) return;

		const reason =
			signal === 'SIGKILL' ? 'The test run timed out' : `The test runner exited with code ${code}`;
		onEvent({ type: 'runFinished', status: 'error', errors: [`${reason}. ${stderr}`.trim()] });
	}

	private send({ runId, workflowId, user }: TestRun, event: WorkflowTestRunEvent) {
		this.push.sendToUsers({ type: 'workflowTestRunEvent', data: { runId, workflowId, event } }, [
			user.id,
		]);
	}
}

const RUN_EVENT_TYPES = new Set<unknown>(['testStarted', 'testFinished', 'runFinished']);

function isRunEvent(value: unknown): value is WorkflowTestRunEvent {
	return isRecord(value) && RUN_EVENT_TYPES.has(value.type);
}
