import { DataSource } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';

@Service()
export class UserLifecycleTransactionService {
	private pending: Promise<void> = Promise.resolve();

	constructor(private readonly dataSource: DataSource) {}

	async run<T>(work: (manager: EntityManager) => Promise<T>, manager?: EntityManager): Promise<T> {
		if (manager) return await work(manager);
		const transact = async () => await this.dataSource.manager.transaction(work);
		if (this.dataSource.options.type !== 'sqlite') return await transact();

		// Legacy SQLite shares one query runner: overlapping transactions become savepoints.
		// Queue the whole transaction so grant issuance and account changes cannot interleave.
		const result = this.pending.then(transact);
		this.pending = result.then(
			() => {},
			() => {},
		);
		return await result;
	}
}
