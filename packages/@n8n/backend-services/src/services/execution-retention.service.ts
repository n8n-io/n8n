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
		await this.assertNoneRetained(async (retained) => {
			const retainedIds = new Set(retained);
			return executionIds.some((id) => retainedIds.has(id));
		});
	}

	/**
	 * Throw when `isAnyRetained` finds a retained execution among the deletion targets.
	 * Callers that find their targets in batches use it to check once before they delete.
	 */
	async assertNoneRetained(
		isAnyRetained: (retainedIds: string[]) => Promise<boolean>,
	): Promise<void> {
		const retainedIds = await this.getRetainedExecutionIds();
		if (retainedIds.length > 0 && (await isAnyRetained(retainedIds)))
			throw new ConflictError(
				'This execution is required by pending work. Cancel that work before deleting it.',
			);
	}
}
