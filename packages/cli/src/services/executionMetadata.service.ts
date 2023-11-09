import { ExecutionMetadataRepository } from '@/databases/repositories';
import { Service } from 'typedi';
import type { ExecutionMetadata } from '@/databases/entities/ExecutionMetadata';

@Service()
export class ExecutionMetadataService {
	constructor(private readonly executionMetadataRepository: ExecutionMetadataRepository) {}

	async save(
		executionId: string,
		executionMetadata: Record<string, string>,
	): Promise<ExecutionMetadata[]> {
		const metadataRows = [];
		for (const [key, value] of Object.entries(executionMetadata)) {
			metadataRows.push({
				execution: { id: executionId },
				key,
				value,
			});
		}

		return this.executionMetadataRepository.save(metadataRows);
	}
}
