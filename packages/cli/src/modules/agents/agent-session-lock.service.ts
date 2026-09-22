import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';

@Service()
export class AgentSessionLock {
	constructor(private readonly dbLockService: DbLockService) {}

	async run<T>(sessionId: string, fn: (ctx: OperationContext) => Promise<T>): Promise<T> {
		const subKey = createHash('sha256').update(sessionId).digest().readInt32BE(0);
		return await this.dbLockService.withLockContext(DbLock.AGENT_SESSION_WRITE, fn, { subKey });
	}
}
