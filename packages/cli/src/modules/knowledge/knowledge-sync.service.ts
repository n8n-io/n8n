import { Logger } from '@n8n/backend-common';
import { CredentialsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import type { ConnectorSyncContext, KnowledgeConnector } from './connectors/connector.types';
import { KnowledgeConnectorRegistry } from './connectors/connector-registry';
import type { KnowledgeSource, KnowledgeSyncStats } from './database/entities';
import {
	KnowledgeDocumentRepository,
	KnowledgeSourceRepository,
	KnowledgeSyncRunRepository,
} from './database/repositories';
import { KnowledgeSourceNotFoundError, KnowledgeSyncInProgressError } from './errors';
import { KnowledgeIndexingService } from './knowledge-indexing.service';
import { KnowledgeConfig } from './knowledge.config';
import { KNOWLEDGE_MODULE_NAME } from './knowledge.constants';

/** `lastError` is troubleshooting context, not a stack trace dump. */
const MAX_ERROR_LENGTH = 1000;

export interface KnowledgeSyncOptions {
	/** Ignore the stored checkpoint and re-read the source from the beginning. */
	fullResync?: boolean;
}

interface RunningSync {
	controller: AbortController;
	/** Settles when the run is over; already has a rejection handler attached. */
	promise: Promise<void>;
}

const emptyStats = (): KnowledgeSyncStats => ({
	documentsSeen: 0,
	documentsIndexed: 0,
	documentsSkipped: 0,
	documentsDeleted: 0,
	chunksWritten: 0,
});

/**
 * Drives connectors: runs them on a timer on the leader, one source at a time,
 * and turns the drafts they yield into indexed documents.
 *
 * A run only persists its checkpoint after the connector returns normally — a
 * failed or aborted run keeps the previous cursor, so the documents it did not
 * reach are picked up next time instead of being skipped forever.
 */
@Service()
export class KnowledgeSyncService {
	private timer: NodeJS.Timeout | undefined;

	/** Syncs running in this process, keyed by source id. */
	private readonly running = new Map<string, RunningSync>();

	constructor(
		private readonly sourceRepository: KnowledgeSourceRepository,
		private readonly documentRepository: KnowledgeDocumentRepository,
		private readonly syncRunRepository: KnowledgeSyncRunRepository,
		private readonly connectorRegistry: KnowledgeConnectorRegistry,
		private readonly indexingService: KnowledgeIndexingService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly knowledgeConfig: KnowledgeConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped(KNOWLEDGE_MODULE_NAME);
	}

	start() {
		if (this.instanceSettings.isLeader) this.startTimer();
	}

	@OnLeaderTakeover()
	startTimer() {
		if (this.timer) return;

		const intervalMs = Math.max(1, this.knowledgeConfig.syncIntervalMinutes) * 60_000;

		this.timer = setInterval(() => {
			// Nothing awaits the tick, so its errors are logged rather than left
			// to surface as an unhandled rejection.
			void this.syncDueSources().catch((error: unknown) => {
				this.logger.error('Knowledge sync tick failed', { error: this.toMessage(error) });
			});
		}, intervalMs);
		this.timer.unref();

		this.logger.debug('Started the knowledge sync timer', { intervalMs });
	}

	@OnLeaderStepdown()
	stopTimer() {
		if (!this.timer) return;

		clearInterval(this.timer);
		this.timer = undefined;
	}

	@OnShutdown()
	async shutdown() {
		this.stopTimer();

		const running = [...this.running.values()];
		for (const { controller } of running) controller.abort();

		await Promise.allSettled(running.map(async ({ promise }) => await promise));
	}

	/** Syncs every source whose interval has elapsed, one after another. */
	async syncDueSources() {
		const sources = await this.sourceRepository.findSourcesDueForSync(
			this.knowledgeConfig.syncIntervalMinutes,
		);

		for (const source of sources) {
			try {
				await this.runSync(source.id);
			} catch (error) {
				// One broken source must not stop the others from syncing.
				this.logger.error('Knowledge source sync failed', {
					sourceId: source.id,
					error: this.toMessage(error),
				});
			}
		}
	}

	/** Runs a sync and resolves when it is done. Rejects with whatever made the run fail. */
	async runSync(sourceId: string, opts: KnowledgeSyncOptions = {}): Promise<void> {
		const { promise } = await this.startSync(sourceId, opts);

		await promise;
	}

	/**
	 * Starts a sync and returns as soon as it is under way, so an HTTP caller
	 * gets an immediate answer. Errors raised while starting (unknown source,
	 * sync already running) still surface to the caller; failures of the run
	 * itself are only logged and end up on the source and its run row.
	 */
	async triggerSync(sourceId: string, opts: KnowledgeSyncOptions = {}): Promise<void> {
		const { promise } = await this.startSync(sourceId, opts);

		promise.catch((error) => {
			this.logger.error('Knowledge source sync failed', {
				sourceId,
				error: this.toMessage(error),
			});
		});
	}

	/**
	 * Removes a source and everything indexed for it. Document and run rows
	 * cascade with the source row, but the vectors do not, so they are dropped
	 * explicitly first.
	 */
	async deleteSource(sourceId: string): Promise<void> {
		const source = await this.sourceRepository.findSourceById(sourceId);

		if (!source) throw new KnowledgeSourceNotFoundError(sourceId);

		const running = this.running.get(sourceId);

		if (running) {
			running.controller.abort();
			// An aborted run rejects by design; the deletion continues regardless.
			await running.promise.catch(() => {});
		}

		await this.indexingService.removeSource(sourceId);
		await this.sourceRepository.delete({ id: sourceId });
	}

	private async startSync(
		sourceId: string,
		opts: KnowledgeSyncOptions,
	): Promise<{ promise: Promise<void> }> {
		const source = await this.sourceRepository.findSourceById(sourceId);

		if (!source) throw new KnowledgeSourceNotFoundError(sourceId);

		if (this.running.has(sourceId)) throw new KnowledgeSyncInProgressError(sourceId);

		if (source.status === 'syncing') {
			// A stored 'syncing' status with no run in this process is left over
			// from an instance that died mid-sync. Treating it as blocking would
			// wedge the source until someone edited the database by hand, so the
			// stale status is taken over instead.
			this.logger.warn('Taking over a knowledge source left in the syncing state', { sourceId });
		}

		const controller = new AbortController();
		const promise = this.executeSync(source, controller.signal, opts.fullResync === true).finally(
			() => {
				this.running.delete(sourceId);
			},
		);

		this.running.set(sourceId, { controller, promise });

		return { promise };
	}

	private async executeSync(
		source: KnowledgeSource,
		abortSignal: AbortSignal,
		fullResync: boolean,
	): Promise<void> {
		const checkpoint = fullResync ? null : source.checkpoint;
		const mode = checkpoint ? 'incremental' : 'full';
		const stats = emptyStats();

		await this.sourceRepository.updateStatus(source.id, 'syncing');
		const run = await this.syncRunRepository.createRun(source.id, mode);

		this.logger.info('Starting a knowledge source sync', { sourceId: source.id, mode });

		try {
			const connector = this.connectorRegistry.getConnector(source.type);

			// Validated up front so a broken config fails before anything is indexed.
			connector.parseConfig(source.config);

			const ctx: ConnectorSyncContext = {
				source,
				checkpoint,
				credential: await this.resolveCredential(source, connector),
				logger: this.logger,
				abortSignal,
			};

			// Driven by hand rather than with `for await`, which discards the
			// generator's return value — and that value carries the checkpoint.
			const iterator = connector.sync(ctx);
			let step = await iterator.next();

			while (step.done !== true) {
				const draft = step.value;
				stats.documentsSeen++;

				const outcome = await this.indexingService.indexDocument(source, draft);

				if (outcome === 'indexed') {
					stats.documentsIndexed++;
					// `indexDocument` reports the outcome only, so the chunk count is
					// read back off the row it just wrote.
					const document = await this.documentRepository.findBySourceAndExternalId(
						source.id,
						draft.externalId,
					);
					stats.chunksWritten += document?.chunkCount ?? 0;
				} else {
					stats.documentsSkipped++;
				}

				step = await iterator.next();
			}

			const result = step.value;

			if (result.deletedExternalIds && result.deletedExternalIds.length > 0) {
				stats.documentsDeleted += await this.indexingService.removeDocuments(
					source,
					result.deletedExternalIds,
				);
			}

			stats.documentsDeleted += await this.pruneMissingDocuments(source, connector, ctx);

			await this.sourceRepository.updateStatus(source.id, 'ready', {
				checkpoint: result.checkpoint,
				lastSyncedAt: new Date(),
				lastError: null,
			});
			await this.syncRunRepository.finishRun(run.id, 'success', stats);

			this.logger.info('Finished a knowledge source sync', { sourceId: source.id, ...stats });
		} catch (error) {
			const message = this.toMessage(error).slice(0, MAX_ERROR_LENGTH);

			// The checkpoint is deliberately left untouched: a partial cursor would
			// permanently skip the documents this run never reached.
			await this.sourceRepository.updateStatus(source.id, 'error', { lastError: message });
			await this.syncRunRepository.finishRun(run.id, 'error', stats, message);

			throw error;
		}
	}

	/**
	 * Drops documents that vanished at the source. Only possible for connectors
	 * that can enumerate their ids cheaply; the rest rely on
	 * `deletedExternalIds`.
	 */
	private async pruneMissingDocuments(
		source: KnowledgeSource,
		connector: KnowledgeConnector,
		ctx: ConnectorSyncContext,
	): Promise<number> {
		if (!connector.listExternalIds) return 0;

		const known = await this.documentRepository.listExternalIds(source.id);
		const current = new Set(await connector.listExternalIds(ctx));
		const stale = known.filter((externalId) => !current.has(externalId));

		return await this.indexingService.removeDocuments(source, stale);
	}

	private async resolveCredential(
		source: KnowledgeSource,
		connector: KnowledgeConnector,
	): Promise<ICredentialDataDecryptedObject | null> {
		if (!connector.requiresCredential) return null;

		if (!source.credentialId) {
			throw new UserError(
				`The knowledge source "${source.name}" needs a credential of type "${source.type}", but none is set.`,
			);
		}

		const credential = await this.credentialsRepository.findOneBy({ id: source.credentialId });

		if (!credential) {
			throw new UserError(
				`The credential "${source.credentialId}" configured for the knowledge source "${source.name}" no longer exists.`,
			);
		}

		return await this.credentialsService.decrypt(credential, true);
	}

	private toMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
