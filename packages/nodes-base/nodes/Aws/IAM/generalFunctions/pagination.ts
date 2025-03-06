import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
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
			resultOptions.options.body = {
				...body,
				PaginationToken: nextPageToken,
			} as IDataObject;
		}

		const responseData = await this.makeRoutingRequest(resultOptions);

		if (responseData && Array.isArray(responseData)) {
			for (const page of responseData) {
				if (page) {
					aggregatedResult.push(page);

					if (!returnAll && aggregatedResult.length >= limit) {
						return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
					}
				}
			}
		} else if (responseData && typeof responseData === 'object') {
			aggregatedResult.push(responseData as IDataObject);

			nextPageToken =
				((responseData as IDataObject).PaginationToken as string | undefined) || undefined;

			if (!returnAll && aggregatedResult.length >= limit) {
				return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
			}
		} else {
			nextPageToken = undefined;
		}
	} while (nextPageToken);

	return aggregatedResult.map((item) => ({ json: item }));
}
