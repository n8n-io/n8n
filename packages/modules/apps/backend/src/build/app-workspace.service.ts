import {
	createFilesystem,
	createSandbox,
	getWorkspaceRoot,
	type SandboxConfig,
} from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { raceAbort } from '@n8n/utils/race-abort';

import { APP_BUILD_SCRIPT } from './app-build-script';
import { APP_DEPENDENCY_KEY } from '../scaffold/app-scaffold';
import { AppSandboxSettings, type AppSandboxResolveOptions } from './app-sandbox-settings';
import { AppBuildError, type AppBuildAttempt, type AppBuildStage } from './app-build.types';
import { AppsConfig } from '../apps.config';
import { AppArchive } from '../app-archive';
import type { AppFiles } from '../storage/app-version-stores';

const FAILURE_MESSAGES = {
	sandbox: 'Sandbox setup failed. Check the sandbox configuration and build log.',
	install: 'Dependency installation failed. Check the build log.',
	build: 'The app build failed. Fix the errors in the build log and save a new version.',
};

@Service()
export class AppWorkspaceService {
	constructor(
		private readonly settings: AppSandboxSettings,
		private readonly config: AppsConfig,
		private readonly archives: AppArchive,
		private readonly logger: Logger,
	) {}

	async build(
		projectId: string,
		appId: string,
		versionId: string,
		attempt: AppBuildAttempt,
		files: AppFiles,
		signal: AbortSignal,
	): Promise<AppFiles> {
		const config = await this.sandboxConfig(projectId, appId);
		if (!config.enabled) throw new BadRequestError('Configure a sandbox provider to build apps.');
		const sandbox = await createSandbox(config, { logger: this.logger });
		if (!sandbox?.executeCommand)
			throw new BadRequestError('The app sandbox must support command execution.');
		const filesystem = createFilesystem(sandbox);
		const execute = sandbox.executeCommand.bind(sandbox);
		const root = `${await raceAbort(getWorkspaceRoot({ sandbox }), signal, () => new AppBuildError('sandbox', 'Sandbox acquisition was interrupted.'))}/app-build`;
		const stage = `${root}/attempts/${versionId}-${attempt.attemptNumber}`;
		await filesystem.mkdir(stage, { recursive: true, abortSignal: signal });
		this.logger.debug('App build sandbox is ready.', {
			appId,
			versionId,
			attempt: attempt.attemptNumber,
			provider: config.provider,
		});
		let commandFinished = false;
		try {
			await filesystem.writeFile(`${stage}/source.tgz`, await this.archives.pack(files), {
				abortSignal: signal,
			});
			await filesystem.writeFile(`${stage}/build.sh`, APP_BUILD_SCRIPT, { abortSignal: signal });
			const deadline = attempt.startedAt.getTime() + this.config.buildTimeoutMs;
			const remaining = deadline - Date.now();
			signal.throwIfAborted();
			if (remaining <= 0) throw new AppBuildError('sandbox', 'The app build timed out.');
			const seconds = Math.max(1, Math.floor(remaining / 1000));
			const commandStartedAt = Date.now();
			const result = await execute(
				'timeout',
				[
					'--kill-after=5s',
					`${seconds}s`,
					'flock',
					'--wait',
					String(seconds),
					`${root}/build.lock`,
					'bash',
					`${stage}/build.sh`,
					root,
					stage,
					APP_DEPENDENCY_KEY,
					String(deadline),
					String(this.config.maxBuildLogBytes),
					String(this.config.buildTimeoutMs),
				],
				{ timeout: remaining, abortSignal: signal, env: { CI: 'true' } },
			);
			this.logger.debug('App build command finished.', {
				appId,
				versionId,
				attempt: attempt.attemptNumber,
				exitCode: result.exitCode,
				timedOut: result.timedOut,
				killed: result.killed,
				durationMs: Date.now() - commandStartedAt,
			});
			commandFinished =
				!result.timedOut && !result.killed && result.exitCode !== 124 && result.exitCode !== 137;
			const log = Buffer.from(`${result.stdout}\n${result.stderr}`)
				.subarray(-this.config.maxBuildLogBytes)
				.toString('utf8');
			if (result.timedOut || result.exitCode === 124 || result.exitCode === 137) {
				throw new AppBuildError('build', 'The app build timed out.', log);
			}
			if (result.exitCode !== 0) {
				const stageName = await filesystem
					.readFile(`${stage}/stage`, { encoding: 'utf8', abortSignal: signal })
					.catch(() => 'sandbox');
				const failedStage: AppBuildStage =
					stageName === 'install' || stageName === 'build' ? stageName : 'sandbox';
				throw new AppBuildError(
					failedStage,
					FAILURE_MESSAGES[failedStage],
					log,
					failedStage === 'install' && /\b(EAI_AGAIN|ECONNRESET|ETIMEDOUT|E503|E429)\b/.test(log),
				);
			}
			const stat = await filesystem.stat(`${stage}/bundle.tgz`, { abortSignal: signal });
			if (stat.size > this.config.maxArtifactSizeBytes)
				throw new AppBuildError('validate', 'The compiled app exceeds the compressed size limit.');
			const body = await filesystem.readFile(`${stage}/bundle.tgz`, { abortSignal: signal });
			if (!Buffer.isBuffer(body))
				throw new AppBuildError('validate', 'The sandbox returned an invalid app bundle.');
			try {
				const bundle = await this.archives.unpack(body, true);
				this.logger.debug('Validated app build bundle.', {
					appId,
					versionId,
					attempt: attempt.attemptNumber,
					fileCount: bundle.size,
					sizeBytes: body.length,
				});
				return bundle;
			} catch (error) {
				if (error instanceof BadRequestError) throw new AppBuildError('validate', error.message);
				throw error;
			}
		} finally {
			// A cancelled remote command can still use its staging files. Let the next build clean them.
			if (commandFinished && !signal.aborted) {
				await filesystem
					.rmdir(stage, { recursive: true, force: true, abortSignal: AbortSignal.timeout(5000) })
					.catch((error: unknown) =>
						this.logger.warn('Could not remove app build staging files.', {
							appId,
							versionId,
							error,
						}),
					);
			}
		}
	}

	async delete(projectId: string, appId: string): Promise<void> {
		const sandbox = await createSandbox(
			await this.sandboxConfig(projectId, appId, { checkEnabled: false }),
			{ logger: this.logger },
		);
		if (sandbox?.deleteRemote) {
			await sandbox.deleteRemote();
			this.logger.debug('Deleted app sandbox.', { appId });
		} else if (sandbox?.destroy) {
			await sandbox.destroy();
			this.logger.debug('Destroyed app sandbox.', { appId });
		}
	}

	private async sandboxConfig(
		projectId: string,
		appId: string,
		options: AppSandboxResolveOptions = {},
	): Promise<SandboxConfig> {
		const config = await this.settings.resolve(projectId, options);
		if (!config.enabled) return config;
		return config.provider === 'daytona'
			? {
					...config,
					id: appId,
					name: `app-build-${appId}`,
					ephemeral: true,
					autoStopInterval: 15,
					autoDeleteInterval: undefined,
				}
			: { ...config, id: appId, ephemeral: true };
	}
}
