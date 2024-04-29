import { Service } from 'typedi';
import { ExecutionMetadataRepository } from '@db/repositories/executionMetadata.repository';
import type { ExecutionMetadata } from '@db/entities/ExecutionMetadata';

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

		return await this.executionMetadataRepository.save(metadataRows);
	}
}
