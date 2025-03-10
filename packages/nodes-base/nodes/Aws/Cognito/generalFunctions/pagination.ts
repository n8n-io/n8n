import type {
	IExecutePaginationFunctions,
	INodeExecutionData,
	DeclarativeRestApiSettings,
	IDataObject,
} from 'n8n-workflow';

export async function handlePagination(
	this: IExecutePaginationFunctions,
	resultOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const aggregatedResult: IDataObject[] = [];
	let nextPageToken: string | undefined;
	const returnAll = this.getNodeParameter('returnAll') as boolean;
	let limit = 60;

	if (!returnAll) {
		limit = this.getNodeParameter('limit') as number;
		resultOptions.maxResults = limit;
	}
	resultOptions.paginate = true;

	do {
		if (nextPageToken) {
			const body =
				typeof resultOptions.options.body === 'object' && resultOptions.options.body !== null
					? resultOptions.options.body
					: {};
			resultOptions.options.body = { ...body, PaginationToken: nextPageToken } as IDataObject;
		}

		const responseData = await this.makeRoutingRequest(resultOptions);

		if (responseData && Array.isArray(responseData)) {
			for (const page of responseData) {
				aggregatedResult.push(page.json);
				if (!returnAll && aggregatedResult.length >= limit) {
					return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
				}
				nextPageToken = page.json.PaginationToken as string | undefined;
			}
		} else if (responseData && typeof responseData === 'object') {
			aggregatedResult.push(responseData as IDataObject);
			nextPageToken = (responseData as IDataObject).PaginationToken as string | undefined;
			if (!returnAll && aggregatedResult.length >= limit) {
				return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
			}
		}
	} while (nextPageToken);

	return aggregatedResult.map((item) => ({ json: item }));
}
