import type { IExecuteSingleFunctions, INodeExecutionData, IN8nHttpFullResponse } from 'n8n-workflow';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (items.length === 0) {
		return items;
	}

	const error = items[0].json.error as any;
	if (error) {
		throw new Error(error.message || 'Произошла ошибка при выполнении запроса к GigaChat API');
	}

	return items;
} 