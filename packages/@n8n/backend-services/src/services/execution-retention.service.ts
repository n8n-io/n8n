import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

/** Modules retain executions through this boundary without exposing their tables. */
@Service()
export class ExecutionRetentionService {
	private readonly providers = new Map<string, () => Promise<string[]>>();

	register(name: string, retainedIds: () => Promise<string[]>): void {
		this.providers.set(name, retainedIds);
	}

	async getRetainedExecutionIds(): Promise<string[]> {
		const ids = await Promise.all(
			[...this.providers.values()].map(async (lookup) => await lookup()),
		);
		return [...new Set(ids.flat())];
	}

	async assertCanDelete(executionIds: string[]): Promise<void> {
		const retained = new Set(await this.getRetainedExecutionIds());
		if (executionIds.some((id) => retained.has(id)))
			throw new ConflictError(
				'This execution is required by pending work. Cancel that work before deleting it.',
			);
	}
}
