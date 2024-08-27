import { Service } from 'typedi';
import { ExecutionMetadataRepository } from '@/databases/repositories/execution-metadata.repository';
import type { ExecutionMetadata } from '@/databases/entities/execution-metadata';

@Service()
export class ExecutionMetadataService {
	constructor(private readonly executionMetadataRepository: ExecutionMetadataRepository) {}

	async save(executionId: string, executionMetadata: Record<string, string>): Promise<void> {
		const metadataRows: Array<Pick<ExecutionMetadata, 'executionId' | 'key' | 'value'>> = [];
		for (const [key, value] of Object.entries(executionMetadata)) {
			metadataRows.push({
				executionId,
				key,
				value,
			});
		}

		await this.executionMetadataRepository.upsert(metadataRows, {
			conflictPaths: { executionId: true, key: true },
		});
	}
}
