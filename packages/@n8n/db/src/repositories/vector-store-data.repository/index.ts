import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { VectorDocument, VectorSearchResult } from 'n8n-workflow';

import { VectorWorkerPool } from './vector-worker-pool';
import { VectorStoreData } from '../../entities';
import { generateNanoId } from '@n8n/utils';

type MemorySnapshot = {
	rssMb: number;
	heapUsedMb: number;
	heapTotalMb: number;
	externalMb: number;
};

function memorySnapshot(): MemorySnapshot {
	const m = process.memoryUsage();
	return {
		rssMb: Math.round(m.rss / 1024 / 1024),
		heapUsedMb: Math.round(m.heapUsed / 1024 / 1024),
		heapTotalMb: Math.round(m.heapTotal / 1024 / 1024),
		externalMb: Math.round(m.external / 1024 / 1024),
	};
}

function memoryDelta(before: MemorySnapshot, after: MemorySnapshot): MemorySnapshot {
	return {
		rssMb: after.rssMb - before.rssMb,
		heapUsedMb: after.heapUsedMb - before.heapUsedMb,
		heapTotalMb: after.heapTotalMb - before.heapTotalMb,
		externalMb: after.externalMb - before.externalMb,
	};
}

@Service()
export class VectorStoreDataRepository extends Repository<VectorStoreData> {
	private workerPool: VectorWorkerPool | null = null;

	constructor(
		dataSource: DataSource,
		private readonly logger: Logger,
	) {
		super(VectorStoreData, dataSource.manager);
	}

	private getWorkerPool(): VectorWorkerPool {
		if (!this.workerPool) {
			this.workerPool = new VectorWorkerPool();
		}
		return this.workerPool;
	}

	async addVectors(
		memoryKey: string,
		projectId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		const embeddingDim = embeddings[0]?.length ?? 0;
		const estimatedBufferMb = Math.round((documents.length * embeddingDim * 4) / 1024 / 1024);
		const before = memorySnapshot();

		this.logger.debug('[VectorStoreRepo] addVectors start', {
			memoryKey,
			projectId,
			documentCount: documents.length,
			embeddingDimension: embeddingDim,
			estimatedSerializedBufferMb: estimatedBufferMb,
			clearStore,
			memory: before,
		});

		const startMs = Date.now();

		if (clearStore) {
			await this.clearStore(memoryKey, projectId);
			this.logger.debug('[VectorStoreRepo] addVectors store cleared', {
				memoryKey,
				memory: memorySnapshot(),
			});
		}

		const entities = documents.map((document, i) => {
			const entity = new VectorStoreData();
			entity.id = generateNanoId();
			entity.memoryKey = memoryKey;
			entity.projectId = projectId;
			entity.content = document.content;
			entity.metadata = document.metadata;
			entity.vector = this.serializeVector(embeddings[i]);
			return entity;
		});

		const afterMapping = memorySnapshot();
		this.logger.debug('[VectorStoreRepo] addVectors entities mapped', {
			memoryKey,
			entityCount: entities.length,
			memory: afterMapping,
			memoryDelta: memoryDelta(before, afterMapping),
		});

		await this.save(entities);

		const after = memorySnapshot();
		this.logger.debug('[VectorStoreRepo] addVectors complete', {
			memoryKey,
			documentCount: documents.length,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});
	}

	async similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const before = memorySnapshot();
		const startMs = Date.now();

		this.logger.debug('[VectorStoreRepo] similaritySearch start', {
			memoryKey,
			projectId,
			queryEmbeddingDimension: queryEmbedding.length,
			k,
			filterKeys: filter ? Object.keys(filter) : [],
			memory: before,
		});

		const qb = this.createQueryBuilder('v').where(
			'v.memoryKey = :memoryKey AND v.projectId = :projectId',
			{ memoryKey, projectId },
		);

		if (filter) {
			const isPostgres = this.manager.connection.options.type === 'postgres';
			for (const [key, value] of Object.entries(filter)) {
				const paramName = `filter_${key}`;
				if (isPostgres) {
					qb.andWhere(`v.metadata->>'${key}' = :${paramName}`, { [paramName]: String(value) });
				} else {
					qb.andWhere(`json_extract(v.metadata, '$.${key}') = :${paramName}`, {
						[paramName]: value,
					});
				}
			}
		}

		let rows: VectorStoreData[];
		try {
			rows = await qb.getMany();
		} catch (e) {
			if (e instanceof RangeError) {
				throw new Error(
					`Vector store ran out of memory while fetching rows for "${memoryKey}". ` +
						`The store may be too large. Reduce the store size or increase available memory.`,
				);
			}
			throw e;
		}

		const afterGetMany = memorySnapshot();
		this.logger.debug('[VectorStoreRepo] similaritySearch rows loaded', {
			memoryKey,
			rowCount: rows.length,
			estimatedRowDataMb:
				rows.length > 0
					? Math.round((rows.length * (rows[0].vector?.length ?? 0)) / 1024 / 1024)
					: 0,
			memory: afterGetMany,
			memoryDelta: memoryDelta(before, afterGetMany),
		});

		if (rows.length === 0) {
			return [];
		}

		const queryVector = new Float32Array(queryEmbedding);

		const afterQueryVector = memorySnapshot();
		this.logger.debug('[VectorStoreRepo] similaritySearch query vector created', {
			memoryKey,
			queryVectorBytes: queryVector.byteLength,
			memory: afterQueryVector,
		});

		// Build a single flat Float32Array (N × dim) and null each raw Buffer
		// as we go so GC can reclaim it before the worker call.
		const vectorDim = rows[0].vector.length / 4;
		const requiredBytes = rows.length * vectorDim * 4;
		let matrix: Float32Array;
		try {
			matrix = new Float32Array(rows.length * vectorDim);
		} catch (e) {
			if (e instanceof RangeError) {
				throw new Error(
					`Vector store ran out of memory while loading "${memoryKey}": ` +
						`tried to allocate ${Math.round(requiredBytes / 1024 / 1024)} MB for ${rows.length} vectors ` +
						`(dim=${vectorDim}). Reduce the store size or increase available memory.`,
				);
			}
			throw e;
		}
		for (let i = 0; i < rows.length; i++) {
			matrix.set(this.deserializeVector(rows[i].vector), i * vectorDim);
			(rows[i] as { vector: Buffer | null }).vector = null;
		}

		const afterDeserialize = memorySnapshot();
		const estimatedFloat32ArraysMb = Math.round((matrix.length * 4) / 1024 / 1024);
		this.logger.debug('[VectorStoreRepo] similaritySearch vectors deserialized into matrix', {
			memoryKey,
			vectorCount: rows.length,
			vectorDimension: vectorDim,
			matrixBytes: matrix.byteLength,
			estimatedFloat32ArraysMb,
			memory: afterDeserialize,
			memoryDelta: memoryDelta(afterGetMany, afterDeserialize),
		});

		// matrix.buffer is transferred to the worker (zero-copy); main thread
		// releases the ~30 MB immediately upon postMessage.
		const { indices, scores } = await this.getWorkerPool().calculateSimilarity(
			queryVector,
			matrix,
			rows.length,
			k,
		);

		const afterSimilarity = memorySnapshot();
		this.logger.debug('[VectorStoreRepo] similaritySearch similarity calculated', {
			memoryKey,
			resultCount: indices.length,
			memory: afterSimilarity,
			memoryDelta: memoryDelta(afterDeserialize, afterSimilarity),
		});

		const results = indices.map((rowIndex, i) => ({
			document: {
				content: rows[rowIndex].content,
				metadata: rows[rowIndex].metadata,
			},
			score: scores[i],
		}));

		const after = memorySnapshot();
		this.logger.debug('[VectorStoreRepo] similaritySearch complete', {
			memoryKey,
			resultCount: results.length,
			durationMs: Date.now() - startMs,
			memoryBefore: before,
			memoryAfter: after,
			memoryDelta: memoryDelta(before, after),
		});

		return results;
	}

	async getVectorCount(memoryKey: string, projectId: string): Promise<number> {
		return await this.countBy({ memoryKey, projectId });
	}

	async clearStore(memoryKey: string, projectId: string): Promise<void> {
		await this.delete({ memoryKey, projectId });
	}

	async deleteStore(memoryKey: string, projectId: string): Promise<void> {
		await this.clearStore(memoryKey, projectId);
	}

	async deleteByFileNames(
		memoryKey: string,
		projectId: string,
		fileNames: string[],
	): Promise<number> {
		if (fileNames.length === 0) {
			return 0;
		}

		const isPostgres = this.manager.connection.options.type === 'postgres';
		const qb = this.createQueryBuilder('vectorStore')
			.delete()
			.where('memoryKey = :memoryKey AND projectId = :projectId', { memoryKey, projectId });

		const orConditions = fileNames.map((_, index) => {
			const paramName = `fileName${index}`;
			return isPostgres
				? `metadata->>'fileName' = :${paramName}`
				: `json_extract(metadata, '$.fileName') = :${paramName}`;
		});

		qb.andWhere(`(${orConditions.join(' OR ')})`, {
			...Object.fromEntries(fileNames.map((name, index) => [`fileName${index}`, name])),
		});

		const result = await qb.execute();
		return result.affected ?? 0;
	}

	async listStores(projectId: string, filter?: string): Promise<string[]> {
		const qb = this.createQueryBuilder('vectorStore')
			.select('DISTINCT vectorStore.memoryKey', 'memoryKey')
			.where('vectorStore.projectId = :projectId', { projectId });

		if (filter) {
			const isPostgres = this.manager.connection.options.type === 'postgres';
			if (isPostgres) {
				qb.andWhere('vectorStore.memoryKey ILIKE :filter', { filter: `%${filter}%` });
			} else {
				qb.andWhere('vectorStore.memoryKey LIKE :filter', { filter: `%${filter}%` });
			}
		}

		const result = await qb.getRawMany<{ memoryKey: string }>();
		return result.map((row) => row.memoryKey);
	}

	async shutdown(): Promise<void> {
		if (this.workerPool) {
			await this.workerPool.shutdown();
			this.workerPool = null;
		}
	}

	private serializeVector(vector: number[]): Buffer {
		const buffer = Buffer.allocUnsafe(vector.length * 4);
		for (let i = 0; i < vector.length; i++) {
			buffer.writeFloatLE(vector[i], i * 4);
		}
		return buffer;
	}

	private deserializeVector(buffer: Buffer): Float32Array {
		const length = buffer.length / 4;
		const vector = new Float32Array(length);
		for (let i = 0; i < length; i++) {
			vector[i] = buffer.readFloatLE(i * 4);
		}
		return vector;
	}
}
