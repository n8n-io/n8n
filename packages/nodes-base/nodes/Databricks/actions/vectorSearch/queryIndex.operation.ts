import { jsonParse, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const indexName = this.getNodeParameter('indexName', i) as string;
	const queryType = this.getNodeParameter('queryType', i) as string;
	const searchMode = this.getNodeParameter('searchMode', i, 'HYBRID') as string;
	const numResults = this.getNodeParameter('numResults', i, 10) as number;
	const columnsStr = this.getNodeParameter('columns', i, '') as string;
	const options = this.getNodeParameter('options', i, {}) as {
		filterExpression?: string;
		scoreThreshold?: number;
	};
	const enableReranking = this.getNodeParameter('enableReranking', i, false) as boolean;
	const rerankerModel = enableReranking
		? (this.getNodeParameter('rerankerModel', i) as string)
		: undefined;
	const columnsToRerank = enableReranking
		? (this.getNodeParameter('columnsToRerank', i) as string)
		: undefined;

	const body: Record<string, unknown> = {
		num_results: numResults,
		query_type: searchMode,
	};

	if (queryType === 'text') {
		body.query_text = this.getNodeParameter('queryText', i) as string;
	} else {
		const queryVectorRaw = this.getNodeParameter('queryVector', i);
		body.query_vector =
			typeof queryVectorRaw === 'string' ? jsonParse(queryVectorRaw) : queryVectorRaw;
	}

	body.columns = columnsStr
		.split(',')
		.map((col) => col.trim())
		.filter(Boolean);

	if (options.filterExpression) body.filters_json = options.filterExpression;
	if (options.scoreThreshold) body.score_threshold = options.scoreThreshold;

	if (enableReranking) {
		body.reranker = {
			model: rerankerModel || 'databricks_reranker',
			parameters: {
				columns_to_rerank: columnsToRerank!
					.split(',')
					.map((col: string) => col.trim())
					.filter(Boolean),
			},
		};
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.0/vector-search/indexes/${indexName}/query`,
		body,
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
