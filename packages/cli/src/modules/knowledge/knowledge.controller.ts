import {
	CreateKnowledgeSourceDto,
	SearchKnowledgeDto,
	SyncKnowledgeSourceDto,
	UpdateKnowledgeSettingsDto,
	UpdateKnowledgeSourceDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Put,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { KnowledgeConnectorRegistry } from './connectors/connector-registry';
import type { KnowledgeSource } from './database/entities';
import {
	KnowledgeDocumentRepository,
	KnowledgeSourceRepository,
	KnowledgeSyncRunRepository,
} from './database/repositories';
import { KnowledgeSourceNotFoundError, KnowledgeSyncInProgressError } from './errors';
import { KnowledgeSearchService } from './knowledge-search.service';
import { KnowledgeSettingsService } from './knowledge-settings.service';
import { KnowledgeSyncService } from './knowledge-sync.service';

/** Runs shown per source; enough to see a pattern without paginating. */
const RECENT_RUNS_LIMIT = 20;

/** Upper bound on results per search, whatever the caller asks for. */
const MAX_TOP_K = 50;

/**
 * Managing sources and the instance-level embedding/vector-store settings is
 * admin work (`knowledge:manage`, mirroring `otel:manage` and `chatHub:manage`).
 * Reading — listing sources and searching — is open to any authenticated user,
 * since indexed knowledge is instance-wide by design.
 */
@RestController('/knowledge')
export class KnowledgeController {
	constructor(
		private readonly settingsService: KnowledgeSettingsService,
		private readonly searchService: KnowledgeSearchService,
		private readonly syncService: KnowledgeSyncService,
		private readonly connectorRegistry: KnowledgeConnectorRegistry,
		private readonly sourceRepository: KnowledgeSourceRepository,
		private readonly documentRepository: KnowledgeDocumentRepository,
		private readonly syncRunRepository: KnowledgeSyncRunRepository,
	) {}

	/** Settings hold credential ids and a model name only, so they need no redaction. */
	@Get('/settings')
	@GlobalScope('knowledge:manage')
	async getSettings() {
		return await this.settingsService.getSettings();
	}

	@Put('/settings')
	@GlobalScope('knowledge:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateKnowledgeSettingsDto,
	) {
		try {
			return await this.settingsService.updateSettings(dto);
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	@Get('/sources')
	async listSources() {
		const sources = await this.sourceRepository.findAllSources();

		return await Promise.all(sources.map(async (source) => await this.toSourceResponse(source)));
	}

	@Post('/sources')
	@GlobalScope('knowledge:manage')
	async createSource(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateKnowledgeSourceDto,
	) {
		try {
			const connector = this.connectorRegistry.getConnector(dto.type);
			const config = connector.parseConfig(dto.config);

			if (connector.requiresCredential && !dto.credentialId) {
				throw new UserError(`A knowledge source of type "${dto.type}" requires a credential.`);
			}

			const source = await this.sourceRepository.save(
				this.sourceRepository.create({
					name: dto.name,
					type: dto.type,
					credentialId: dto.credentialId ?? null,
					config,
					status: 'pending',
				}),
			);

			return await this.toSourceResponse(source);
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	@Patch('/sources/:id')
	@GlobalScope('knowledge:manage')
	async updateSource(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body dto: UpdateKnowledgeSourceDto,
	) {
		try {
			const source = await this.getSourceOrThrow(id);
			const connector = this.connectorRegistry.getConnector(source.type);

			if (dto.name !== undefined) source.name = dto.name;
			if (dto.credentialId !== undefined) source.credentialId = dto.credentialId;
			if (dto.config !== undefined) source.config = connector.parseConfig(dto.config);

			if (connector.requiresCredential && !source.credentialId) {
				throw new UserError(`A knowledge source of type "${source.type}" requires a credential.`);
			}

			return await this.toSourceResponse(await this.sourceRepository.save(source));
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	@Delete('/sources/:id')
	@GlobalScope('knowledge:manage')
	async deleteSource(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		try {
			await this.syncService.deleteSource(id);

			return { success: true };
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	/** Returns as soon as the sync is under way; progress shows up in the run list. */
	@Post('/sources/:id/sync')
	@GlobalScope('knowledge:manage')
	async syncSource(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body dto: SyncKnowledgeSourceDto,
	) {
		try {
			await this.syncService.triggerSync(id, { fullResync: dto.fullResync });

			return { started: true };
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	@Get('/sources/:id/runs')
	@GlobalScope('knowledge:manage')
	async listRuns(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		try {
			await this.getSourceOrThrow(id);

			return await this.syncRunRepository.findRecentRuns(id, RECENT_RUNS_LIMIT);
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	@Post('/search')
	async search(_req: AuthenticatedRequest, _res: Response, @Body dto: SearchKnowledgeDto) {
		try {
			const results = await this.searchService.search(dto.query, {
				sourceIds: dto.sourceIds,
				topK: dto.topK === undefined ? undefined : Math.min(dto.topK, MAX_TOP_K),
			});

			return { results };
		} catch (error) {
			this.rethrowAsHttpError(error);
		}
	}

	private async getSourceOrThrow(id: string): Promise<KnowledgeSource> {
		const source = await this.sourceRepository.findSourceById(id);

		if (!source) throw new KnowledgeSourceNotFoundError(id);

		return source;
	}

	private async toSourceResponse(source: KnowledgeSource) {
		return {
			id: source.id,
			name: source.name,
			type: source.type,
			status: source.status,
			lastSyncedAt: source.lastSyncedAt,
			lastError: source.lastError,
			documentCount: await this.documentRepository.countBySource(source.id),
		};
	}

	/** Subclasses are checked before `UserError` itself, which they extend. */
	private rethrowAsHttpError(error: unknown): never {
		if (error instanceof KnowledgeSourceNotFoundError) throw new NotFoundError(error.message);
		if (error instanceof KnowledgeSyncInProgressError) throw new ConflictError(error.message);
		if (error instanceof UserError) throw new BadRequestError(error.message);

		throw error;
	}
}
