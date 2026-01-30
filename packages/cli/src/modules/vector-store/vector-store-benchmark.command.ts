import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { nanoid } from 'nanoid';
import z from 'zod';

import type { VectorStoreDataRepository } from './vector-store-data.repository';

import { BaseCommand } from '@/commands/base-command';

const flagsSchema = z.object({
	'num-vectors': z
		.number()
		.int()
		.default(1000)
		.describe('Number of vectors to use for benchmarking'),
	'vector-dimension': z
		.number()
		.int()
		.default(1536)
		.describe('Dimension of the vectors (e.g., 1536 for OpenAI embeddings)'),
	'batch-size': z.number().int().default(100).describe('Number of vectors to add in each batch'),
	'search-count': z.number().int().default(10).describe('Number of similarity searches to perform'),
	'search-k': z.number().int().default(5).describe('Number of results to return per search'),
	iterations: z.number().int().default(3).describe('Number of iterations to run for averaging'),
});

interface BenchmarkResults {
	operation: string;
	totalTime: number;
	avgTime: number;
	throughput?: number;
	unit?: string;
}

@Command({
	name: 'vector-store:benchmark',
	description: 'Benchmark LanceDB vector store operations',
	examples: [
		'',
		'--num-vectors=5000 --vector-dimension=768',
		'--batch-size=500 --search-count=100',
		'--iterations=5',
	],
	flagsSchema,
})
export class VectorStoreBenchmark extends BaseCommand<z.infer<typeof flagsSchema>> {
	private readonly testProjectId = `benchmark-${nanoid()}`;
	private readonly testMemoryKey = 'benchmark-test';

	async run() {
		const { flags } = this;

		this.log('Starting LanceDB benchmark...');
		this.log('Configuration:');
		this.log(`  Vectors: ${flags['num-vectors']}`);
		this.log(`  Dimension: ${flags['vector-dimension']}`);
		this.log(`  Batch size: ${flags['batch-size']}`);
		this.log(`  Searches: ${flags['search-count']}`);
		this.log(`  Results per search (k): ${flags['search-k']}`);
		this.log(`  Iterations: ${flags.iterations}`);
		this.log('');

		// Initialize the module
		const { VectorStoreDataRepository } = await import('./vector-store-data.repository');
		const repository = Container.get(VectorStoreDataRepository);
		await repository.init();

		const results: BenchmarkResults[] = [];

		try {
			// Run benchmark iterations
			for (let iteration = 1; iteration <= flags.iterations; iteration++) {
				this.log(`\nIteration ${iteration}/${flags.iterations}`);
				this.log('='.repeat(50));

				// Benchmark: Add vectors in batches
				const addResults = await this.benchmarkAddVectors(
					repository,
					flags['num-vectors'],
					flags['vector-dimension'],
					flags['batch-size'],
				);
				results.push(addResults);

				// Benchmark: Count vectors
				const countResults = await this.benchmarkCountVectors(repository);
				results.push(countResults);

				// Benchmark: Similarity search
				const searchResults = await this.benchmarkSimilaritySearch(
					repository,
					flags['vector-dimension'],
					flags['search-count'],
					flags['search-k'],
				);
				results.push(searchResults);

				// Benchmark: Clear store
				const clearResults = await this.benchmarkClearStore(repository);
				results.push(clearResults);
			}

			// Calculate and display aggregate results
			this.displayAggregateResults(results, flags.iterations);
		} finally {
			// Cleanup
			await this.cleanup(repository);
		}
	}

	private async benchmarkAddVectors(
		repository: VectorStoreDataRepository,
		numVectors: number,
		dimension: number,
		batchSize: number,
	): Promise<BenchmarkResults> {
		this.log(
			`\nBenchmark: Adding ${numVectors} vectors (${dimension}d) in batches of ${batchSize}`,
		);

		const startTime = performance.now();
		let totalAdded = 0;

		// Add vectors in batches
		for (let i = 0; i < numVectors; i += batchSize) {
			const currentBatchSize = Math.min(batchSize, numVectors - i);
			const documents = this.generateTestDocuments(currentBatchSize);
			const embeddings = this.generateRandomEmbeddings(currentBatchSize, dimension);

			await repository.addVectors(
				this.testMemoryKey,
				this.testProjectId,
				documents,
				embeddings,
				false,
			);

			totalAdded += currentBatchSize;
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const throughput = (totalAdded / totalTime) * 1000; // vectors per second

		this.log(`  Time: ${totalTime.toFixed(2)}ms`);
		this.log(`  Throughput: ${throughput.toFixed(0)} vectors/sec`);

		return {
			operation: 'add_vectors',
			totalTime,
			avgTime: totalTime / (numVectors / batchSize),
			throughput,
			unit: 'vectors/sec',
		};
	}

	private async benchmarkCountVectors(
		repository: VectorStoreDataRepository,
	): Promise<BenchmarkResults> {
		this.log('\nBenchmark: Count vectors');

		const startTime = performance.now();
		const count = await repository.getVectorCount(this.testMemoryKey, this.testProjectId);
		const endTime = performance.now();
		const totalTime = endTime - startTime;

		this.log(`  Count: ${count}`);
		this.log(`  Time: ${totalTime.toFixed(2)}ms`);

		return {
			operation: 'count_vectors',
			totalTime,
			avgTime: totalTime,
		};
	}

	private async benchmarkSimilaritySearch(
		repository: VectorStoreDataRepository,
		dimension: number,
		searchCount: number,
		k: number,
	): Promise<BenchmarkResults> {
		this.log(`\nBenchmark: Similarity search (${searchCount} queries, k=${k})`);

		const startTime = performance.now();

		for (let i = 0; i < searchCount; i++) {
			const queryEmbedding = this.generateRandomEmbedding(dimension);
			await repository.similaritySearch(this.testMemoryKey, this.testProjectId, queryEmbedding, k);
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgTime = totalTime / searchCount;
		const throughput = (searchCount / totalTime) * 1000; // queries per second

		this.log(`  Total time: ${totalTime.toFixed(2)}ms`);
		this.log(`  Avg per query: ${avgTime.toFixed(2)}ms`);
		this.log(`  Throughput: ${throughput.toFixed(1)} queries/sec`);

		return {
			operation: 'similarity_search',
			totalTime,
			avgTime,
			throughput,
			unit: 'queries/sec',
		};
	}

	private async benchmarkClearStore(
		repository: VectorStoreDataRepository,
	): Promise<BenchmarkResults> {
		this.log('\nBenchmark: Clear store');

		const startTime = performance.now();
		await repository.clearStore(this.testMemoryKey, this.testProjectId);
		const endTime = performance.now();
		const totalTime = endTime - startTime;

		this.log(`  Time: ${totalTime.toFixed(2)}ms`);

		return {
			operation: 'clear_store',
			totalTime,
			avgTime: totalTime,
		};
	}

	private displayAggregateResults(results: BenchmarkResults[], iterations: number) {
		this.log('\n');
		this.log('='.repeat(50));
		this.log('AGGREGATE RESULTS');
		this.log('='.repeat(50));

		// Group results by operation
		const grouped = new Map<string, BenchmarkResults[]>();
		for (const result of results) {
			if (!grouped.has(result.operation)) {
				grouped.set(result.operation, []);
			}
			grouped.get(result.operation)!.push(result);
		}

		// Calculate and display averages
		for (const [operation, operationResults] of grouped.entries()) {
			const avgTotalTime = operationResults.reduce((sum, r) => sum + r.totalTime, 0) / iterations;
			const avgAvgTime = operationResults.reduce((sum, r) => sum + r.avgTime, 0) / iterations;

			this.log(`\n${operation.toUpperCase().replace(/_/g, ' ')}`);
			this.log(`  Avg total time: ${avgTotalTime.toFixed(2)}ms`);

			if (operationResults[0].throughput !== undefined) {
				const avgThroughput =
					operationResults.reduce((sum, r) => sum + (r.throughput ?? 0), 0) / iterations;
				this.log(`  Avg throughput: ${avgThroughput.toFixed(1)} ${operationResults[0].unit}`);
			}

			if (operation === 'similarity_search') {
				this.log(`  Avg per query: ${avgAvgTime.toFixed(2)}ms`);
			}
		}

		this.log('\n' + '='.repeat(50));
	}

	private async cleanup(repository: VectorStoreDataRepository) {
		this.log('\nCleaning up test data...');
		try {
			await repository.deleteStore(this.testMemoryKey, this.testProjectId);
			this.log('Cleanup complete');
		} catch (error) {
			this.logger.error('Error during cleanup', { error: error as Error });
		}
	}

	private generateTestDocuments(count: number) {
		const documents = [];
		for (let i = 0; i < count; i++) {
			documents.push({
				content: `Test document ${i} with some sample content for benchmarking purposes.`,
				metadata: {
					index: i,
					type: 'benchmark',
					timestamp: new Date().toISOString(),
				},
			});
		}
		return documents;
	}

	private generateRandomEmbedding(dimension: number): number[] {
		const embedding = [];
		for (let i = 0; i < dimension; i++) {
			embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
		}
		// Normalize the vector
		const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
		return embedding.map((val) => val / magnitude);
	}

	private generateRandomEmbeddings(count: number, dimension: number): number[][] {
		const embeddings = [];
		for (let i = 0; i < count; i++) {
			embeddings.push(this.generateRandomEmbedding(dimension));
		}
		return embeddings;
	}

	async catch(error: Error) {
		this.logger.error('Failed to run benchmark');
		this.logger.error(error.message);
	}
}
