import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { QdrantClient, Schemas } from '@qdrant/js-client-rest';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { KnowledgeNotConfiguredError } from './errors';
import { KnowledgeSettingsService } from './knowledge-settings.service';

/** Points per upsert request — large enough to amortize round trips, small enough to stay under Qdrant's body limits. */
const UPSERT_BATCH_SIZE = 200;

/**
 * Payload fields we filter on. Qdrant (and Qdrant Cloud in strict mode)
 * rejects filters on unindexed fields, so every filtered key needs a keyword
 * index — including `externalId`, which document pruning filters by.
 */
const INDEXED_PAYLOAD_FIELDS = ['sourceId', 'documentId', 'externalId'] as const;

export interface KnowledgeVectorPoint {
	/** Must be a UUID — Qdrant only accepts UUID or unsigned-integer point ids. */
	id: string;
	vector: number[];
	payload: Record<string, unknown>;
}

export interface KnowledgeVectorHit {
	id: string;
	score: number;
	payload: Record<string, unknown>;
}

interface QdrantConnection {
	/** `credentialId:collectionName` — a settings change produces a different key. */
	key: string;
	client: QdrantClient;
	collectionName: string;
}

function readVectorSize(value: unknown): number | undefined {
	if (!value || typeof value !== 'object') return undefined;
	if ('size' in value && typeof value.size === 'number') return value.size;
	return undefined;
}

/** Reads the vector size off either a single default-vector or named-vector collection config. */
function extractVectorSize(vectorsConfig: unknown): number | undefined {
	if (!vectorsConfig || typeof vectorsConfig !== 'object') return undefined;

	const direct = readVectorSize(vectorsConfig);
	if (direct !== undefined) return direct;

	const firstNamedVector: unknown = Object.values(vectorsConfig)[0];
	return readVectorSize(firstNamedVector);
}

function matchValue(key: string, value: string): Schemas['Condition'] {
	return { key, match: { value } };
}

/**
 * Owns every Qdrant detail of the knowledge module: client construction from
 * the admin-configured credential, collection lifecycle, and the payload
 * filters used for reads and deletes.
 *
 * Filters are built here and never accepted from a caller — `search` only
 * takes a list of source ids, which is the boundary that keeps a query from
 * reaching chunks of a source the caller is not allowed to see.
 */
@Service()
export class KnowledgeVectorStoreService {
	private connection: QdrantConnection | null = null;

	/** `connectionKey:dimension` combinations already verified in this process. */
	private readonly ensured = new Set<string>();

	constructor(
		private readonly settingsService: KnowledgeSettingsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
	) {}

	/**
	 * Creates the collection when missing and makes sure the payload indexes
	 * exist. Idempotent; a collection whose vector size does not match the
	 * configured embedding model is a hard error rather than a silent failure
	 * at query time.
	 */
	async ensureCollection(dimension: number): Promise<void> {
		const { key, client, collectionName } = await this.getConnection();
		const ensuredKey = `${key}:${dimension}`;

		if (this.ensured.has(ensuredKey)) return;

		const { exists } = await client.collectionExists(collectionName);

		if (exists) {
			await this.assertVectorSize(client, collectionName, dimension);
		} else {
			try {
				await client.createCollection(collectionName, {
					vectors: { size: dimension, distance: 'Cosine' },
				});
			} catch (error) {
				// A concurrent sync may have created it in between; only re-throw
				// when it is still missing.
				const { exists: existsNow } = await client.collectionExists(collectionName);
				if (!existsNow) throw error;
				await this.assertVectorSize(client, collectionName, dimension);
			}
		}

		for (const field of INDEXED_PAYLOAD_FIELDS) {
			await client.createPayloadIndex(collectionName, {
				field_name: field,
				field_schema: 'keyword',
				wait: true,
			});
		}

		this.ensured.add(ensuredKey);
	}

	async upsertChunks(points: KnowledgeVectorPoint[]): Promise<void> {
		if (points.length === 0) return;

		const { client, collectionName } = await this.getConnection();

		for (let start = 0; start < points.length; start += UPSERT_BATCH_SIZE) {
			await client.upsert(collectionName, {
				wait: true,
				points: points.slice(start, start + UPSERT_BATCH_SIZE),
			});
		}
	}

	async deleteByDocumentId(sourceId: string, documentId: string): Promise<void> {
		await this.deleteByFilter({
			must: [matchValue('sourceId', sourceId), matchValue('documentId', documentId)],
		});
	}

	async deleteBySourceId(sourceId: string): Promise<void> {
		await this.deleteByFilter({ must: [matchValue('sourceId', sourceId)] });
	}

	async deleteByExternalIds(sourceId: string, externalIds: string[]): Promise<void> {
		if (externalIds.length === 0) return;

		await this.deleteByFilter({
			must: [
				matchValue('sourceId', sourceId),
				// eslint-disable-next-line id-denylist -- `any` is Qdrant's match-schema field name
				{ key: 'externalId', match: { any: externalIds } },
			],
		});
	}

	/**
	 * Nearest neighbours restricted to `sourceIds`. The filter is built here on
	 * purpose: callers pass ids they have already authorized, never raw filters.
	 */
	async search(
		vector: number[],
		opts: { sourceIds: string[]; topK: number },
	): Promise<KnowledgeVectorHit[]> {
		if (opts.sourceIds.length === 0) return [];

		const { client, collectionName } = await this.getConnection();

		const response = await client.query(collectionName, {
			query: vector,
			limit: opts.topK,
			with_payload: true,
			filter: {
				// eslint-disable-next-line id-denylist -- `any` is Qdrant's match-schema field name
				must: [{ key: 'sourceId', match: { any: opts.sourceIds } }],
			},
		});

		return response.points.map((point) => ({
			id: String(point.id),
			score: point.score,
			payload: point.payload ?? {},
		}));
	}

	private async deleteByFilter(filter: Schemas['Filter']): Promise<void> {
		const { client, collectionName } = await this.getConnection();

		await client.delete(collectionName, { wait: true, filter });
	}

	private async assertVectorSize(
		client: QdrantClient,
		collectionName: string,
		dimension: number,
	): Promise<void> {
		const info = await client.getCollection(collectionName);
		const existing = extractVectorSize(info.config?.params?.vectors);

		if (existing !== undefined && existing !== dimension) {
			throw new UserError(
				`Qdrant collection "${collectionName}" stores ${existing}-dimensional vectors but the configured embedding model produces ${dimension}. ` +
					'This happens when the embedding model changes after indexing. Point the knowledge settings at a new collection name, or delete the collection and re-index every source.',
			);
		}
	}

	private async getConnection(): Promise<QdrantConnection> {
		const { vectorStore } = await this.settingsService.getSettings();

		if (!vectorStore) throw new KnowledgeNotConfiguredError();

		const key = `${vectorStore.credentialId}:${vectorStore.collectionName}`;
		const connection = this.connection;

		if (connection?.key === key) return connection;

		const credential = await this.credentialsRepository.findOneBy({ id: vectorStore.credentialId });

		if (!credential) {
			throw new UserError(
				`The vector store credential "${vectorStore.credentialId}" configured for knowledge no longer exists.`,
			);
		}

		const data = await this.credentialsService.decrypt(credential, true);
		const url = typeof data.qdrantUrl === 'string' ? data.qdrantUrl : '';

		if (url === '') {
			throw new UserError('The Qdrant credential configured for knowledge has no URL.');
		}

		const apiKey = typeof data.apiKey === 'string' && data.apiKey !== '' ? data.apiKey : undefined;
		const { QdrantClient: QdrantClientCtor } = await import('@qdrant/js-client-rest');
		const client = new QdrantClientCtor({ url, ...(apiKey ? { apiKey } : {}) });

		const next: QdrantConnection = { key, client, collectionName: vectorStore.collectionName };
		this.connection = next;
		// A new connection may point at a different collection; its readiness has
		// not been verified yet.
		this.ensured.clear();

		return next;
	}
}
