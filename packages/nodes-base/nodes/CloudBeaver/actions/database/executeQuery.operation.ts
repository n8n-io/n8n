import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { JsonObject } from 'n8n-workflow';

import { CloudBeaverClient } from '../../transport/CloudBeaverClient';
import type { RequestFn } from '../../helpers/interfaces';
import { QueryError, TimeoutError } from '../../errors';
import { transformResults } from '../../helpers/utils';
import { ExecuteSqlUseCase } from './ExecuteSqlUseCase';

export async function execute(
	this: IExecuteFunctions,
	request: RequestFn,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const client = new CloudBeaverClient(request);
	const useCase = new ExecuteSqlUseCase(client);

	for (let i = 0; i < items.length; i++) {
		const connectionId = this.getNodeParameter('connectionId', i) as string;
		const query = this.getNodeParameter('query', i) as string;
		const limit = this.getNodeParameter('limit', i) as number;
		const offset = this.getNodeParameter('offset', i) as number;
		const orderBy = (this.getNodeParameter('orderBy', i) as string).trim() || undefined;
		const where = (this.getNodeParameter('where', i) as string).trim() || undefined;

		if (!connectionId) {
			throw new NodeOperationError(this.getNode(), 'Connection ID is required', {
				itemIndex: i,
			});
		}
		if (!query?.trim()) {
			throw new NodeOperationError(this.getNode(), 'SQL query is empty', { itemIndex: i });
		}
		if (!Number.isInteger(limit) || limit < 1) {
			throw new NodeOperationError(this.getNode(), 'Limit must be a positive integer', {
				itemIndex: i,
			});
		}
		if (!Number.isInteger(offset) || offset < 0) {
			throw new NodeOperationError(this.getNode(), 'Offset must be a non-negative integer', {
				itemIndex: i,
			});
		}

		const options = this.getNodeParameter('options', i, {}) as {
			queryTimeout?: number;
			replaceEmptyStrings?: boolean;
		};
		const timeoutMs = (options.queryTimeout ?? 60) * 1000;
		const replaceEmptyStrings = options.replaceEmptyStrings ?? false;

		try {
			const raw = await useCase.execute({
				connectionId,
				query,
				limit,
				offset,
				orderBy,
				where,
				timeoutMs,
			});
			const rows = transformResults({ results: raw }, { replaceEmptyStrings });
			returnData.push(...rows.map((row) => ({ ...row, pairedItem: { item: i } })));
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { ...items[i].json, error: (error as Error).message },
					pairedItem: { item: i },
				});
				continue;
			}

			if (error instanceof TimeoutError) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
			}
			if (error instanceof QueryError) {
				throw new NodeApiError(this.getNode(), { message: error.message } as JsonObject);
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	return returnData;
}
