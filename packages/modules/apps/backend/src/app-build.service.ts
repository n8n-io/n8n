import type { AppBuildResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceWriteAccessService } from '@n8n/backend-services';
import { DbLock, DbLockService } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { raceAbort } from '@n8n/utils/race-abort';
import { setTimeout as delay } from 'node:timers/promises';

import { AppBuildError, type AppBuildStage } from './app-build.types';
import { checkBuildSource } from './app-scaffold';
import { appStorageLockSubKey } from './app-storage-lock';
import type { AppVersion } from './app-version.entity';
import { AppVersionRepository } from './app-version.repository';
import { AppVersionService } from './app-version.service';
import { AppWorkspaceService } from './app-workspace.service';
import { AppsConfig } from './apps.config';

@Service()
export class AppBuildService {
	private readonly stopping = new AbortController();
	private readonly active = new Set<Promise<AppBuildResponse>>();

	constructor(
		private readonly versions: AppVersionRepository,
		private readonly versionService: AppVersionService,
		private readonly workspaces: AppWorkspaceService,
		private readonly locks: DbLockService,
		private readonly writeAccess: InstanceWriteAccessService,
		private readonly logger: Logger,
		private readonly config: AppsConfig,
	) {}

	assertWritable() {
		if (this.writeAccess.isReadOnly())
			throw new ForbiddenError('This instance does not allow app changes.');
		if (this.stopping.signal.aborted)
			throw new ConflictError('The instance is stopping. Retry the app build.');
	}

	async status(projectId: string, appId: string, versionId: string): Promise<AppBuildResponse> {
		return this.response(await this.versionService.getVersion(projectId, appId, versionId));
	}

	async build(
		projectId: string,
		appId: string,
		versionId: string,
		retry = false,
	): Promise<AppBuildResponse> {
		this.assertWritable();
		await this.versionService.getVersion(projectId, appId, versionId);
		const work = this.run(projectId, appId, versionId, retry);
		this.active.add(work);
		try {
			return await work;
		} finally {
			this.active.delete(work);
		}
	}

	private async run(
		projectId: string,
		appId: string,
		versionId: string,
		retry: boolean,
	): Promise<AppBuildResponse> {
		let previousAttemptNumber: number | undefined;
		for (let index = 0; index < this.config.maxBuildAttempts; index++) {
			const attempt = await this.locks.withLockContext(
				DbLock.APPS_STORAGE,
				async (ctx) =>
					await this.versions.claimBuild(
						appId,
						versionId,
						previousAttemptNumber ?? (retry ? 'failed' : 'queued'),
						ctx,
					),
				{ subKey: appStorageLockSubKey(appId) },
			);
			if (!attempt)
				throw new ConflictError('The app build is already running or cannot be retried.');
			const deadline = AbortSignal.timeout(this.config.buildTimeoutMs);
			const signal = AbortSignal.any([deadline, this.stopping.signal]);
			let stage: 'source' | 'sandbox' | 'store' = 'source';
			const aborted = () => new AppBuildError(stage, 'The app build was interrupted.');
			try {
				const source = await raceAbort(
					this.versionService.readSource(projectId, appId, versionId),
					signal,
					aborted,
				);
				checkBuildSource(source);
				stage = 'sandbox';
				const files = await raceAbort(
					this.workspaces.build(appId, versionId, attempt, source, signal),
					signal,
					aborted,
				);
				stage = 'store';
				const completed = await raceAbort(
					this.versionService.attachBundle(projectId, appId, versionId, files, attempt),
					signal,
					aborted,
				);
				return this.response(completed);
			} catch (error) {
				let failure = this.buildError(error, stage, signal, deadline);
				this.logger.warn('App build attempt failed.', {
					appId,
					versionId,
					attempt: attempt.attemptNumber,
					stage: failure.stage,
					error: failure.message,
					log: failure.log,
				});
				if (
					failure.retryable &&
					index + 1 < this.config.maxBuildAttempts &&
					!this.stopping.signal.aborted
				) {
					try {
						// Keep the version running so retention and manual retries cannot take it during the delay.
						await delay(1000 * (index + 1), undefined, { signal: this.stopping.signal });
						previousAttemptNumber = attempt.attemptNumber;
						continue;
					} catch (error) {
						failure = this.buildError(error, stage, signal, deadline);
					}
				}
				const failed = await this.locks.withLockContext(
					DbLock.APPS_STORAGE,
					async (ctx) => await this.versions.failBuild(versionId, attempt.attemptNumber, ctx),
					{ subKey: appStorageLockSubKey(appId) },
				);
				if (!failed) {
					const current = await this.status(projectId, appId, versionId);
					// Storage can finish just before shutdown or a deadline interrupts the response.
					if (current.status === 'succeeded' && current.attempts === attempt.attemptNumber)
						return current;
					throw new ConflictError('This app build attempt no longer owns the version.');
				}
				return {
					...this.response(failed),
					diagnostics: {
						stage: failure.stage,
						message: failure.message.slice(0, 2000),
						log: Buffer.from(failure.log).subarray(-this.config.maxBuildLogBytes).toString('utf8'),
					},
				};
			}
		}
		throw new ConflictError('The app build could not start.');
	}

	private buildError(
		error: unknown,
		stage: AppBuildStage,
		signal: AbortSignal,
		deadline: AbortSignal,
	): AppBuildError {
		if (signal.aborted)
			return new AppBuildError(
				stage,
				deadline.aborted
					? 'The app build timed out. Retry the build.'
					: 'Instance shutdown interrupted the app build. Retry the build.',
			);
		if (error instanceof AppBuildError) return error;
		const retryable = !(
			error instanceof BadRequestError ||
			error instanceof ConflictError ||
			error instanceof ForbiddenError ||
			error instanceof NotFoundError
		);
		return new AppBuildError(
			stage,
			error instanceof Error ? error.message : 'The app build failed. Retry the build.',
			'',
			retryable,
		);
	}

	private response(version: AppVersion): AppBuildResponse {
		return {
			versionId: version.id,
			status: version.buildStatus,
			attempts: version.buildAttempts,
			statusUpdatedAt: version.buildStatusUpdatedAt?.toISOString() ?? null,
		};
	}

	@OnShutdown()
	async shutdown() {
		this.stopping.abort();
		await Promise.allSettled(this.active);
	}
}
