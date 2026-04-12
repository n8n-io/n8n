import {
	ASYNC_SQL_EXECUTE_QUERY,
	ASYNC_SQL_EXECUTE_RESULTS,
	ASYNC_TASK_INFO,
	INIT_CONNECTION,
	SQL_CONTEXT_CREATE,
	SQL_CONTEXT_DESTROY,
} from '../queries';
import { ContextError, QueryError, TimeoutError } from '../errors';
import type {
	AsyncTaskResult,
	GqlResponse,
	IdResponse,
	RequestFn,
	SQLExecuteInfo,
} from '../helpers/interfaces';

function unwrap<T>(
	response: GqlResponse<T>,
	errorFactory: (msg: string) => Error,
	fallback: string,
): T {
	if (response.errors?.length) {
		throw errorFactory(response.errors[0].message ?? fallback);
	}
	if (response.data === undefined) {
		throw errorFactory(fallback);
	}
	return response.data;
}

export class CloudBeaverClient {
	constructor(private readonly request: RequestFn) {}

	async initConnection(connectionId: string, projectId: string): Promise<void> {
		const response = await this.request<{ initConnection?: IdResponse }>({
			...INIT_CONNECTION,
			variables: { id: connectionId, projectId },
		});
		unwrap(response, (msg) => new QueryError(msg), 'Failed to initialize connection');
	}

	async createContext(connectionId: string, projectId: string): Promise<string> {
		const response = await this.request<{ sqlContextCreate?: IdResponse }>({
			...SQL_CONTEXT_CREATE,
			variables: { connectionId, projectId },
		});
		const data = unwrap(response, (msg) => new ContextError(msg), 'Failed to create SQL context');
		const contextId = data.sqlContextCreate?.id;
		if (!contextId) throw new ContextError('CloudBeaver returned no context ID');
		return contextId;
	}

	async executeQuery(params: {
		connectionId: string;
		contextId: string;
		sql: string;
		limit: number;
		offset: number;
		projectId: string;
	}): Promise<string> {
		const response = await this.request<{ asyncSqlExecuteQuery?: IdResponse }>({
			...ASYNC_SQL_EXECUTE_QUERY,
			variables: {
				connectionId: params.connectionId,
				contextId: params.contextId,
				sql: params.sql,
				filter: { limit: params.limit, offset: params.offset },
				projectId: params.projectId,
			},
		});
		const data = unwrap(response, (msg) => new QueryError(msg), 'Failed to execute query');
		const taskId = data.asyncSqlExecuteQuery?.id;
		if (!taskId) throw new QueryError('CloudBeaver returned no task ID');
		return taskId;
	}

	async pollTask(taskId: string, timeoutMs = 60_000): Promise<void> {
		const initialIntervalMs = 50;
		const maxIntervalMs = 500;
		const deadline = Date.now() + timeoutMs;
		let intervalMs = initialIntervalMs;

		while (Date.now() < deadline) {
			const response = await this.request<{ asyncTaskInfo?: AsyncTaskResult }>({
				...ASYNC_TASK_INFO,
				variables: { id: taskId },
			});
			const data = unwrap(response, (msg) => new QueryError(msg), 'Failed to fetch task info');
			const task = data.asyncTaskInfo ?? null;

			if (task?.error?.message) {
				throw new QueryError(`Task error: ${task.error.message}`);
			}

			if (task && !task.running) return;

			await new Promise((resolve) => setTimeout(resolve, intervalMs));
			intervalMs = Math.min(intervalMs * 2, maxIntervalMs);
		}

		throw new TimeoutError(`Query timed out after ${timeoutMs / 1000}s`);
	}

	async getResults(taskId: string): Promise<SQLExecuteInfo> {
		const response = await this.request<{ asyncSqlExecuteResults?: SQLExecuteInfo }>({
			...ASYNC_SQL_EXECUTE_RESULTS,
			variables: { taskId },
		});
		const data = unwrap(response, (msg) => new QueryError(msg), 'Failed to fetch results');
		return data.asyncSqlExecuteResults ?? { results: [] };
	}

	async destroyContext(connectionId: string, contextId: string, projectId: string): Promise<void> {
		try {
			await this.request({
				...SQL_CONTEXT_DESTROY,
				variables: { connectionId, contextId, projectId },
			});
		} catch {}
	}
}
