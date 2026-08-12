import type { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { KnowledgeConnectorRegistry } from '../connectors/connector-registry';
import type {
	ConnectorSyncContext,
	ConnectorSyncResult,
	KnowledgeConnector,
	KnowledgeDocumentDraft,
} from '../connectors/connector.types';
import type { KnowledgeDocument, KnowledgeSource, KnowledgeSyncRun } from '../database/entities';
import type {
	KnowledgeDocumentRepository,
	KnowledgeSourceRepository,
	KnowledgeSyncRunRepository,
} from '../database/repositories';
import { KnowledgeSourceNotFoundError, KnowledgeSyncInProgressError } from '../errors';
import type { KnowledgeIndexingService } from '../knowledge-indexing.service';
import { KnowledgeSyncService } from '../knowledge-sync.service';
import { KnowledgeConfig } from '../knowledge.config';

// vitest-mock-extended re-proxies nested values, which mangles plain objects and
// dates, so fixtures carrying them are assigned onto the mock instead.
const makeSource = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource =>
	Object.assign(mock<KnowledgeSource>(), {
		id: 'source-1',
		name: 'Docs',
		type: 'github' as const,
		credentialId: 'cred-1',
		config: { owner: 'n8n-io', repo: 'n8n' },
		status: 'ready' as const,
		lastSyncedAt: null,
		checkpoint: null,
		lastError: null,
		...overrides,
	});

const makeDraft = (externalId: string): KnowledgeDocumentDraft => ({
	externalId,
	title: `Title ${externalId}`,
	text: `Text of ${externalId}`,
	metadata: {},
});

const makeConnector = (overrides: Partial<KnowledgeConnector> = {}): KnowledgeConnector => ({
	type: 'github',
	requiresCredential: false,
	parseConfig: vi.fn().mockReturnValue({}),
	sync: vi.fn(),
	...overrides,
});

/** Builds a `sync` implementation yielding `drafts` and returning `result`. */
const syncYielding = (drafts: KnowledgeDocumentDraft[], result: ConnectorSyncResult) =>
	async function* (
		_ctx: ConnectorSyncContext,
	): AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult> {
		for (const draft of drafts) yield draft;

		return result;
	};

describe('KnowledgeSyncService', () => {
	const sourceRepository = mock<KnowledgeSourceRepository>();
	const documentRepository = mock<KnowledgeDocumentRepository>();
	const syncRunRepository = mock<KnowledgeSyncRunRepository>();
	const connectorRegistry = mock<KnowledgeConnectorRegistry>();
	const indexingService = mock<KnowledgeIndexingService>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
	const instanceSettings = mock<InstanceSettings>();
	const logger = mock<Logger>();

	let service: KnowledgeSyncService;

	const buildService = () =>
		new KnowledgeSyncService(
			sourceRepository,
			documentRepository,
			syncRunRepository,
			connectorRegistry,
			indexingService,
			credentialsRepository,
			credentialsService,
			new KnowledgeConfig(),
			instanceSettings,
			logger,
		);

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		syncRunRepository.createRun.mockResolvedValue(mock<KnowledgeSyncRun>({ id: 'run-1' }));
		documentRepository.listExternalIds.mockResolvedValue([]);
		documentRepository.findBySourceAndExternalId.mockResolvedValue(
			mock<KnowledgeDocument>({ chunkCount: 2 }),
		);
		indexingService.indexDocument.mockResolvedValue('indexed');
		indexingService.removeDocuments.mockResolvedValue(0);
		service = buildService();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('runSync', () => {
		it('indexes drafts, then persists the checkpoint and marks the source ready', async () => {
			const source = makeSource();
			sourceRepository.findSourceById.mockResolvedValue(source);
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					sync: syncYielding([makeDraft('issue:1'), makeDraft('issue:2')], {
						checkpoint: { since: '2026-01-01T00:00:00.000Z' },
					}),
				}),
			);
			indexingService.indexDocument.mockResolvedValueOnce('indexed');
			indexingService.indexDocument.mockResolvedValueOnce('skipped');

			await service.runSync('source-1');

			expect(sourceRepository.updateStatus).toHaveBeenNthCalledWith(1, 'source-1', 'syncing');
			expect(sourceRepository.updateStatus).toHaveBeenNthCalledWith(2, 'source-1', 'ready', {
				checkpoint: { since: '2026-01-01T00:00:00.000Z' },
				lastSyncedAt: expect.any(Date),
				lastError: null,
			});
			expect(syncRunRepository.createRun).toHaveBeenCalledWith('source-1', 'full');
			expect(syncRunRepository.finishRun).toHaveBeenCalledWith('run-1', 'success', {
				documentsSeen: 2,
				documentsIndexed: 1,
				documentsSkipped: 1,
				documentsDeleted: 0,
				chunksWritten: 2,
			});
		});

		it('runs in incremental mode when a checkpoint exists, and full on a full resync', async () => {
			const source = makeSource({ checkpoint: { since: '2025-12-01T00:00:00.000Z' } });
			sourceRepository.findSourceById.mockResolvedValue(source);
			const sync = vi.fn(syncYielding([], { checkpoint: { since: 'next' } }));
			connectorRegistry.getConnector.mockReturnValue(makeConnector({ sync }));

			await service.runSync('source-1');

			expect(syncRunRepository.createRun).toHaveBeenCalledWith('source-1', 'incremental');
			expect(sync.mock.calls[0][0]).toMatchObject({
				checkpoint: { since: '2025-12-01T00:00:00.000Z' },
			});

			await service.runSync('source-1', { fullResync: true });

			expect(syncRunRepository.createRun).toHaveBeenLastCalledWith('source-1', 'full');
			expect(sync.mock.calls[1][0]).toMatchObject({ checkpoint: null });
		});

		it('keeps the checkpoint and marks the source errored when the connector throws', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					// eslint-disable-next-line require-yield
					async *sync() {
						throw new OperationalError('Sync aborted');
					},
				}),
			);

			await expect(service.runSync('source-1')).rejects.toThrow('Sync aborted');

			expect(sourceRepository.updateStatus).toHaveBeenLastCalledWith('source-1', 'error', {
				lastError: 'Sync aborted',
			});
			const checkpointWrites = sourceRepository.updateStatus.mock.calls.filter(
				([, , update]) => update?.checkpoint !== undefined,
			);
			expect(checkpointWrites).toEqual([]);
			expect(syncRunRepository.finishRun).toHaveBeenCalledWith(
				'run-1',
				'error',
				expect.objectContaining({ documentsIndexed: 0 }),
				'Sync aborted',
			);
		});

		it('throws when the source does not exist', async () => {
			sourceRepository.findSourceById.mockResolvedValue(null);

			await expect(service.runSync('missing')).rejects.toThrow(KnowledgeSourceNotFoundError);
			expect(syncRunRepository.createRun).not.toHaveBeenCalled();
		});

		it('rejects a second sync while one is running for the same source', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			let release = () => {};
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			indexingService.indexDocument.mockImplementation(async () => {
				await gate;
				return 'indexed';
			});
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({ sync: syncYielding([makeDraft('issue:1')], { checkpoint: {} }) }),
			);

			const inFlight = service.runSync('source-1');
			await vi.waitFor(() => expect(indexingService.indexDocument).toHaveBeenCalled());

			await expect(service.runSync('source-1')).rejects.toThrow(KnowledgeSyncInProgressError);

			release();
			await inFlight;

			// The guard is released once the run is over.
			await expect(service.runSync('source-1')).resolves.toBeUndefined();
		});

		it('takes over a source left in the syncing state by a crashed run', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource({ status: 'syncing' }));
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({ sync: syncYielding([], { checkpoint: {} }) }),
			);

			await service.runSync('source-1');

			expect(logger.warn).toHaveBeenCalledWith(
				'Taking over a knowledge source left in the syncing state',
				{ sourceId: 'source-1' },
			);
			expect(syncRunRepository.finishRun).toHaveBeenCalledWith(
				'run-1',
				'success',
				expect.anything(),
			);
		});

		it('removes the externalIds the connector reports as deleted', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					sync: syncYielding([], { checkpoint: {}, deletedExternalIds: ['issue:9'] }),
				}),
			);
			indexingService.removeDocuments.mockResolvedValue(1);

			await service.runSync('source-1');

			expect(indexingService.removeDocuments).toHaveBeenCalledWith(expect.anything(), ['issue:9']);
			expect(syncRunRepository.finishRun).toHaveBeenCalledWith(
				'run-1',
				'success',
				expect.objectContaining({ documentsDeleted: 1 }),
			);
		});

		it('prunes indexed documents the connector no longer lists', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			documentRepository.listExternalIds.mockResolvedValue([
				'workflow:1',
				'workflow:2',
				'workflow:3',
			]);
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					sync: syncYielding([], { checkpoint: {} }),
					listExternalIds: vi.fn().mockResolvedValue(['workflow:1', 'workflow:3']),
				}),
			);
			indexingService.removeDocuments.mockResolvedValue(1);

			await service.runSync('source-1');

			expect(indexingService.removeDocuments).toHaveBeenCalledWith(expect.anything(), [
				'workflow:2',
			]);
		});

		it('decrypts the credential for connectors that require one', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			const sync = vi.fn(syncYielding([], { checkpoint: {} }));
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({ requiresCredential: true, sync }),
			);
			const credential = mock<CredentialsEntity>({ id: 'cred-1' });
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsService.decrypt.mockResolvedValue({ accessToken: 'token' });

			await service.runSync('source-1');

			expect(credentialsService.decrypt).toHaveBeenCalledWith(credential, true);
			expect(sync.mock.calls[0][0]).toMatchObject({ credential: { accessToken: 'token' } });
		});

		it('fails with a clear error when a required credential is missing', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource({ credentialId: null }));
			connectorRegistry.getConnector.mockReturnValue(makeConnector({ requiresCredential: true }));

			await expect(service.runSync('source-1')).rejects.toThrow(/needs a credential/);
			expect(sourceRepository.updateStatus).toHaveBeenLastCalledWith(
				'source-1',
				'error',
				expect.objectContaining({ lastError: expect.stringContaining('needs a credential') }),
			);
		});
	});

	describe('triggerSync', () => {
		it('returns before the run finishes and logs its failure', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					// eslint-disable-next-line require-yield
					async *sync() {
						throw new OperationalError('boom');
					},
				}),
			);

			await expect(service.triggerSync('source-1')).resolves.toBeUndefined();

			await vi.waitFor(() =>
				expect(logger.error).toHaveBeenCalledWith('Knowledge source sync failed', {
					sourceId: 'source-1',
					error: 'boom',
				}),
			);
		});

		it('surfaces an already-running sync to the caller', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			let release = () => {};
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			indexingService.indexDocument.mockImplementation(async () => {
				await gate;
				return 'indexed';
			});
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({ sync: syncYielding([makeDraft('issue:1')], { checkpoint: {} }) }),
			);

			const inFlight = service.runSync('source-1');
			await vi.waitFor(() => expect(indexingService.indexDocument).toHaveBeenCalled());

			await expect(service.triggerSync('source-1')).rejects.toThrow(KnowledgeSyncInProgressError);

			release();
			await inFlight;
		});
	});

	describe('deleteSource', () => {
		it('aborts an in-flight sync, drops the index and deletes the source', async () => {
			const source = makeSource();
			sourceRepository.findSourceById.mockResolvedValue(source);
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					async *sync(ctx): AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult> {
						yield makeDraft('issue:1');
						if (ctx.abortSignal?.aborted) throw new OperationalError('Sync aborted');

						return { checkpoint: {} };
					},
				}),
			);
			let release = () => {};
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			indexingService.indexDocument.mockImplementation(async () => {
				await gate;
				return 'indexed';
			});

			const inFlight = service.runSync('source-1');
			await vi.waitFor(() => expect(indexingService.indexDocument).toHaveBeenCalled());

			const deletion = service.deleteSource('source-1');
			release();
			await expect(inFlight).rejects.toThrow('Sync aborted');
			await deletion;

			expect(indexingService.removeSource).toHaveBeenCalledWith('source-1');
			expect(sourceRepository.delete).toHaveBeenCalledWith({ id: 'source-1' });
		});

		it('throws when the source does not exist', async () => {
			sourceRepository.findSourceById.mockResolvedValue(null);

			await expect(service.deleteSource('missing')).rejects.toThrow(KnowledgeSourceNotFoundError);
			expect(indexingService.removeSource).not.toHaveBeenCalled();
		});
	});

	describe('the sync timer', () => {
		it('starts only on the leader', () => {
			vi.useFakeTimers();
			const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

			Object.assign(instanceSettings, { isLeader: false });
			buildService().start();
			expect(setIntervalSpy).not.toHaveBeenCalled();

			Object.assign(instanceSettings, { isLeader: true });
			buildService().start();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
		});

		it('syncs due sources on leader takeover and stops on stepdown', async () => {
			vi.useFakeTimers();
			const dueSource = makeSource({ id: 'due-1' });
			sourceRepository.findSourcesDueForSync.mockResolvedValue([dueSource]);
			sourceRepository.findSourceById.mockResolvedValue(dueSource);
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({ sync: syncYielding([], { checkpoint: {} }) }),
			);

			service.startTimer();
			await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

			expect(sourceRepository.findSourcesDueForSync).toHaveBeenCalledWith(60);
			expect(syncRunRepository.createRun).toHaveBeenCalledWith('due-1', 'full');

			service.stopTimer();
			await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

			expect(sourceRepository.findSourcesDueForSync).toHaveBeenCalledTimes(1);
		});

		it('keeps syncing the remaining sources when one fails', async () => {
			sourceRepository.findSourcesDueForSync.mockResolvedValue([
				makeSource({ id: 'broken' }),
				makeSource({ id: 'fine' }),
			]);
			sourceRepository.findSourceById.mockImplementation(
				async (id: string) => makeSource({ id }) as never,
			);
			connectorRegistry.getConnector.mockImplementation(() =>
				makeConnector({ sync: syncYielding([], { checkpoint: {} }) }),
			);
			syncRunRepository.createRun.mockRejectedValueOnce(new Error('db is down'));

			await service.syncDueSources();

			expect(logger.error).toHaveBeenCalledWith('Knowledge source sync failed', {
				sourceId: 'broken',
				error: 'db is down',
			});
			expect(syncRunRepository.createRun).toHaveBeenCalledWith('fine', 'full');
		});
	});

	describe('shutdown', () => {
		it('stops the timer and aborts in-flight syncs', async () => {
			sourceRepository.findSourceById.mockResolvedValue(makeSource());
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					async *sync(ctx): AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult> {
						yield makeDraft('issue:1');
						if (ctx.abortSignal?.aborted) throw new OperationalError('Sync aborted');

						return { checkpoint: {} };
					},
				}),
			);
			let release = () => {};
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			indexingService.indexDocument.mockImplementation(async () => {
				await gate;
				return 'indexed';
			});

			const inFlight = service.runSync('source-1');
			await vi.waitFor(() => expect(indexingService.indexDocument).toHaveBeenCalled());

			const shutdown = service.shutdown();
			release();
			await expect(inFlight).rejects.toThrow('Sync aborted');
			await shutdown;

			expect(sourceRepository.updateStatus).toHaveBeenLastCalledWith('source-1', 'error', {
				lastError: 'Sync aborted',
			});
		});
	});
});
