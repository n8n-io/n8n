import {
	CreateKnowledgeSourceDto,
	SearchKnowledgeDto,
	SyncKnowledgeSourceDto,
	UpdateKnowledgeSourceDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { KnowledgeConnectorRegistry } from '../connectors/connector-registry';
import type { KnowledgeConnector } from '../connectors/connector.types';
import type { KnowledgeSource } from '../database/entities';
import type {
	KnowledgeDocumentRepository,
	KnowledgeSourceRepository,
	KnowledgeSyncRunRepository,
} from '../database/repositories';
import { KnowledgeSourceNotFoundError, KnowledgeSyncInProgressError } from '../errors';
import type { KnowledgeSearchService } from '../knowledge-search.service';
import type { KnowledgeSettingsService } from '../knowledge-settings.service';
import type { KnowledgeSyncService } from '../knowledge-sync.service';
import { KnowledgeController } from '../knowledge.controller';

const req = mock<AuthenticatedRequest>();
const res = mock<Response>();

const makeSource = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource =>
	Object.assign(mock<KnowledgeSource>(), {
		id: 'source-1',
		name: 'Docs',
		type: 'github' as const,
		credentialId: 'cred-1',
		config: { owner: 'n8n-io', repo: 'n8n' },
		status: 'ready' as const,
		lastSyncedAt: null,
		lastError: null,
		checkpoint: null,
		...overrides,
	});

const makeConnector = (overrides: Partial<KnowledgeConnector> = {}): KnowledgeConnector => ({
	type: 'github',
	requiresCredential: true,
	parseConfig: vi.fn((config: unknown) => ({ ...(config as Record<string, unknown>) })),
	sync: vi.fn(),
	...overrides,
});

describe('KnowledgeController', () => {
	const settingsService = mock<KnowledgeSettingsService>();
	const searchService = mock<KnowledgeSearchService>();
	const syncService = mock<KnowledgeSyncService>();
	const connectorRegistry = mock<KnowledgeConnectorRegistry>();
	const sourceRepository = mock<KnowledgeSourceRepository>();
	const documentRepository = mock<KnowledgeDocumentRepository>();
	const syncRunRepository = mock<KnowledgeSyncRunRepository>();

	let controller: KnowledgeController;

	beforeEach(() => {
		vi.clearAllMocks();
		documentRepository.countBySource.mockResolvedValue(3);
		connectorRegistry.getConnector.mockReturnValue(makeConnector());
		controller = new KnowledgeController(
			settingsService,
			searchService,
			syncService,
			connectorRegistry,
			sourceRepository,
			documentRepository,
			syncRunRepository,
		);
	});

	describe('listSources', () => {
		it('returns the sources with their document counts', async () => {
			sourceRepository.findAllSources.mockResolvedValue([makeSource()]);

			await expect(controller.listSources()).resolves.toEqual([
				{
					id: 'source-1',
					name: 'Docs',
					type: 'github',
					status: 'ready',
					lastSyncedAt: null,
					lastError: null,
					documentCount: 3,
				},
			]);
		});
	});

	describe('createSource', () => {
		it('validates the config through the connector and stores a pending source', async () => {
			const connector = makeConnector();
			connectorRegistry.getConnector.mockReturnValue(connector);
			sourceRepository.create.mockReturnValue(makeSource({ status: 'pending' }));
			sourceRepository.save.mockResolvedValue(makeSource({ status: 'pending' }));

			const result = await controller.createSource(
				req,
				res,
				new CreateKnowledgeSourceDto({
					name: 'Docs',
					type: 'github',
					credentialId: 'cred-1',
					config: { owner: 'n8n-io', repo: 'n8n' },
				}),
			);

			expect(connector.parseConfig).toHaveBeenCalledWith({ owner: 'n8n-io', repo: 'n8n' });
			expect(sourceRepository.create).toHaveBeenCalledWith({
				name: 'Docs',
				type: 'github',
				credentialId: 'cred-1',
				config: { owner: 'n8n-io', repo: 'n8n' },
				status: 'pending',
			});
			expect(result).toMatchObject({ id: 'source-1', status: 'pending' });
		});

		it('rejects a source that needs a credential without one', async () => {
			await expect(
				controller.createSource(
					req,
					res,
					new CreateKnowledgeSourceDto({ name: 'Docs', type: 'github', config: {} }),
				),
			).rejects.toThrow(BadRequestError);
			expect(sourceRepository.save).not.toHaveBeenCalled();
		});

		it('turns an invalid config into a bad request', async () => {
			connectorRegistry.getConnector.mockReturnValue(
				makeConnector({
					parseConfig: vi.fn(() => {
						throw new UserError('Invalid GitHub knowledge source configuration: owner: required');
					}),
				}),
			);

			await expect(
				controller.createSource(
					req,
					res,
					new CreateKnowledgeSourceDto({
						name: 'Docs',
						type: 'github',
						credentialId: 'cred-1',
						config: {},
					}),
				),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('updateSource', () => {
		it('re-validates the config against the stored connector', async () => {
			const source = makeSource();
			sourceRepository.findSourceById.mockResolvedValue(source);
			sourceRepository.save.mockResolvedValue(source);
			const connector = makeConnector();
			connectorRegistry.getConnector.mockReturnValue(connector);

			await controller.updateSource(
				req,
				res,
				'source-1',
				new UpdateKnowledgeSourceDto({
					name: 'Renamed',
					config: { owner: 'n8n-io', repo: 'docs' },
				}),
			);

			expect(connector.parseConfig).toHaveBeenCalledWith({ owner: 'n8n-io', repo: 'docs' });
			expect(sourceRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'Renamed', config: { owner: 'n8n-io', repo: 'docs' } }),
			);
		});

		it('is a 404 for an unknown source', async () => {
			sourceRepository.findSourceById.mockResolvedValue(null);

			await expect(
				controller.updateSource(req, res, 'missing', new UpdateKnowledgeSourceDto({})),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('syncSource', () => {
		it('starts a sync and answers right away', async () => {
			await expect(
				controller.syncSource(req, res, 'source-1', new SyncKnowledgeSourceDto({})),
			).resolves.toEqual({ started: true });
			expect(syncService.triggerSync).toHaveBeenCalledWith('source-1', { fullResync: undefined });
		});

		it('is a 409 while a sync is already running', async () => {
			syncService.triggerSync.mockRejectedValue(new KnowledgeSyncInProgressError('source-1'));

			await expect(
				controller.syncSource(req, res, 'source-1', new SyncKnowledgeSourceDto({})),
			).rejects.toThrow(ConflictError);
		});
	});

	describe('deleteSource', () => {
		it('is a 404 for an unknown source', async () => {
			syncService.deleteSource.mockRejectedValue(new KnowledgeSourceNotFoundError('missing'));

			await expect(controller.deleteSource(req, res, 'missing')).rejects.toThrow(NotFoundError);
		});
	});

	describe('search', () => {
		it('caps topK and returns the hits', async () => {
			searchService.search.mockResolvedValue([]);

			await controller.search(
				req,
				res,
				new SearchKnowledgeDto({ query: 'how do I deploy?', topK: 500 }),
			);

			expect(searchService.search).toHaveBeenCalledWith('how do I deploy?', {
				sourceIds: undefined,
				topK: 50,
			});
		});

		it('turns a not-configured error into a bad request', async () => {
			searchService.search.mockRejectedValue(
				new UserError('Knowledge connectors are not configured'),
			);

			await expect(
				controller.search(req, res, new SearchKnowledgeDto({ query: 'anything' })),
			).rejects.toThrow(BadRequestError);
		});
	});
});
