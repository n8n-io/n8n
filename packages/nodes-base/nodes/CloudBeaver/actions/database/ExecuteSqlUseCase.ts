import type { CloudBeaverClient } from '../../transport/CloudBeaverClient';
import type { SQLQueryResults } from '../../helpers/interfaces';

const PROJECT_ID = 'g_GlobalConfiguration';

export class ExecuteSqlUseCase {
	constructor(private readonly client: CloudBeaverClient) {}

	async execute(input: {
		connectionId: string;
		query: string;
		limit: number;
		offset: number;
		orderBy?: string;
		where?: string;
		timeoutMs: number;
	}): Promise<SQLQueryResults[]> {
		const { connectionId, query, limit, offset, orderBy, where, timeoutMs } = input;

		let sql = query.trim().replace(/;$/, '');
		if (where)
			sql = `SELECT *
		                  FROM (${sql}) AS _q
		                  WHERE ${where}`;
		if (orderBy) sql += ` ORDER BY ${orderBy}`;

		await this.client.initConnection(connectionId, PROJECT_ID);

		const contextId = await this.client.createContext(connectionId, PROJECT_ID);

		try {
			const taskId = await this.client.executeQuery({
				connectionId,
				contextId,
				sql,
				limit,
				offset,
				projectId: PROJECT_ID,
			});

			await this.client.pollTask(taskId, timeoutMs);

			const executeInfo = await this.client.getResults(taskId);
			return executeInfo.results ?? [];
		} finally {
			await this.client.destroyContext(connectionId, contextId, PROJECT_ID);
		}
	}
}
