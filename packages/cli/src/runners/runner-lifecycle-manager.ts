import { TaskRunnersConfig } from '@n8n/config';
import { strict } from 'node:assert';
import { Service } from 'typedi';

import { Time } from '@/constants';
import { OnShutdown } from '@/decorators/on-shutdown';
import { Logger } from '@/logging/logger.service';
import { TaskRunnerProcess } from '@/runners/task-runner-process';
import { TypedEmitter } from '@/typed-emitter';

export type RunnerLifecycleEventMap = {
	'runner:started': never;
	'runner:stopped': never;
};

@Service()
export class RunnerLifecycleEvents extends TypedEmitter<RunnerLifecycleEventMap> {}

/**
 * Responsible for launching a task runner if none available and shutting it down
 * if idle for too long. Only for `internal_childprocess` and `internal_launcher` modes.
 */
@Service()
export class RunnerLifecycleManager {
	private state: 'stopped' | 'starting' | 'running' | 'stopping' = 'stopped';

	private startPromise: Promise<void> | null = null;

	private lastActivityTime: number = Date.now();

	private idleChecksInterval: NodeJS.Timeout | null = null;

	constructor(
		private readonly logger: Logger,
		private readonly taskRunnerProcess: TaskRunnerProcess,
		readonly runnerConfig: TaskRunnersConfig,
		private readonly lifecycleEvents: RunnerLifecycleEvents,
	) {
		const { mode } = runnerConfig;

		strict(
			mode === 'internal_childprocess' || mode === 'internal_launcher',
			'Runner mode must be `internal_childprocess` or `internal_launcher`',
		);

		this.startIdleChecks();
	}

	async ensureRunnerAvailable() {
		if (this.state === 'running') return;

		if (this.state === 'starting') return await this.startPromise;

		this.state = 'starting';

		this.startPromise = this.startRunnerProcess().finally(() => {
			this.startPromise = null;
		});

		return await this.startPromise;
	}

	updateLastActivityTime() {
		this.lastActivityTime = Date.now();
	}

	private async startRunnerProcess() {
		try {
			this.logger.debug('Starting task runner process');
			await this.taskRunnerProcess.start();

			this.lifecycleEvents.emit('runner:started');

			this.state = 'running';
			this.lastActivityTime = Date.now();
		} catch (error) {
			this.state = 'stopped';
			throw error;
		}
	}

	private startIdleChecks() {
		const idleTimeout = this.runnerConfig.idleTimeout * Time.minutes.toMilliseconds;
		const idleChecksFrequency = this.runnerConfig.idleChecksFrequency * Time.minutes.toMilliseconds;

		this.idleChecksInterval = setInterval(() => {
			if (this.state === 'running' && Date.now() - this.lastActivityTime > idleTimeout) {
				this.logger.info('Runner has been idle for too long, stopping it');
				void this.stopRunner();
			}
		}, idleChecksFrequency);
	}

	private async stopRunner() {
		if (this.state !== 'running') return;

		this.state = 'stopping';

		try {
			await this.taskRunnerProcess.stop();
			this.lifecycleEvents.emit('runner:stopped');
		} finally {
			this.state = 'stopped';
		}
	}

	@OnShutdown()
	async shutdown() {
		if (this.idleChecksInterval) clearInterval(this.idleChecksInterval);

		await this.stopRunner();
	}
}
