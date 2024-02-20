import { Service } from 'typedi';
import { ExecutionMetadata } from '@db/entities/ExecutionMetadata';
import { DataSource } from '@n8n/typeorm';

@Service()
export class ExecutionMetadataService {
	constructor(private readonly dataSource: DataSource) {}

	async save(
		executionId: string,
		executionMetadata: Record<string, string>,
	): Promise<ExecutionMetadata[]> {
		const metadataRows = Object.entries(executionMetadata).map(([key, value]) => ({
			execution: { id: executionId },
			key,
			value,
		}));

		return await this.dataSource.transaction(async (tx) => {
			return await tx.save(ExecutionMetadata, metadataRows);
		});
	}
}
