import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { VectorDocument, VectorSearchResult } from 'n8n-workflow';

import { VectorWorkerPool } from './vector-worker-pool';
import { VectorStoreData } from '../../entities';
import { generateNanoId } from '@n8n/utils';

@Service()
export class VectorStoreDataRepository extends Repository<VectorStoreData> {
	private workerPool: VectorWorkerPool | null = null;

	constructor(dataSource: DataSource) {
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
		if (clearStore) {
			await this.clearStore(memoryKey, projectId);
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

		await this.save(entities);
	}

	async similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
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

		const rows = await qb.getMany();
		if (rows.length === 0) {
			return [];
		}

		const queryVector = new Float32Array(queryEmbedding);
		const vectors = rows.map((row) => this.deserializeVector(row.vector));
		const { indices, scores } = await this.getWorkerPool().calculateSimilarity(
			queryVector,
			vectors,
			k,
		);

		return indices.map((rowIndex, i) => ({
			document: {
				content: rows[rowIndex].content,
				metadata: rows[rowIndex].metadata,
			},
			score: scores[i],
		}));
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
