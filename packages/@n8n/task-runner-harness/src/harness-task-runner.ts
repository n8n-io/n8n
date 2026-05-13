import { TaskRunner } from '@n8n/task-runner';
import type { TaskParams, TaskRunnerOpts, TaskResultData } from '@n8n/task-runner';

import { executeCli } from './cli-executor';
import type { HarnessRunnerConfig } from './config/harness-runner-config';
import { verifyBinary } from './preflight';
import type { HarnessTaskSettings } from './types';

export interface HarnessTaskRunnerOpts extends TaskRunnerOpts {
	harnessConfig: HarnessRunnerConfig;
}

/**
 * Task runner that executes external CLI tools (AI agents, coding assistants, etc.)
 * in controlled workspace directories.
 *
 * Extends the base TaskRunner to:
 * - Spawn CLI commands as child processes with curated environment
 * - Enforce timeouts with SIGTERM/SIGKILL escalation
 * - Capture stdout/stderr with size limits
 * - Support cancellation via the broker protocol
 * - Run pre-flight checks on the requested binary before execution
 */
export class HarnessTaskRunner extends TaskRunner {
	private readonly harnessConfig: HarnessRunnerConfig;

	constructor(opts: HarnessTaskRunnerOpts) {
		super({
			...opts,
			taskType: 'harness',
			name: opts.name ?? 'Harness Task Runner',
		});
		this.harnessConfig = opts.harnessConfig;
	}

	override async executeTask(
		taskParams: TaskParams<HarnessTaskSettings>,
		signal: AbortSignal,
	): Promise<TaskResultData> {
		const settings = taskParams.settings;

		if (!settings || !settings.command) {
			throw new Error('Harness task settings are missing or invalid: command is required');
		}

		// Pre-flight: verify the requested binary is available
		const preflight = await verifyBinary(settings.command);
		if (!preflight.available) {
			return {
				result: {
					stdout: '',
					stderr: preflight.error ?? `'${settings.command}' is not available`,
					exitCode: 127, // Standard "command not found" exit code
					duration: 0,
					stdoutTruncated: false,
					stderrTruncated: false,
				},
			};
		}

		// Apply defaults from harness config where the node didn't specify
		const effectiveSettings: HarnessTaskSettings = {
			...settings,
			timeout: settings.timeout || this.harnessConfig.taskTimeout,
			maxOutputSize: settings.maxOutputSize || this.harnessConfig.maxOutputSize,
		};

		const result = await executeCli(effectiveSettings, { signal });

		return { result };
	}
}
