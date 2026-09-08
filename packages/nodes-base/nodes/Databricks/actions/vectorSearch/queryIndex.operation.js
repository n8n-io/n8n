import { jsonParse } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const indexName = this.getNodeParameter('indexName', i);
    const queryType = this.getNodeParameter('queryType', i);
    const searchMode = this.getNodeParameter('searchMode', i, 'HYBRID');
    const numResults = this.getNodeParameter('numResults', i, 10);
    const columnsStr = this.getNodeParameter('columns', i, '');
    const options = this.getNodeParameter('options', i, {});
    const enableReranking = this.getNodeParameter('enableReranking', i, false);
    const rerankerModel = enableReranking
        ? this.getNodeParameter('rerankerModel', i)
        : undefined;
    const columnsToRerank = enableReranking
        ? this.getNodeParameter('columnsToRerank', i)
        : undefined;
    const body = {
        num_results: numResults,
        query_type: searchMode,
    };
    if (queryType === 'text') {
        body.query_text = this.getNodeParameter('queryText', i);
    }
    else {
        const queryVectorRaw = this.getNodeParameter('queryVector', i);
        body.query_vector =
            typeof queryVectorRaw === 'string' ? jsonParse(queryVectorRaw) : queryVectorRaw;
    }
    body.columns = columnsStr
        .split(',')
        .map((col) => col.trim())
        .filter(Boolean);
    if (options.filterExpression)
        body.filters_json = options.filterExpression;
    if (options.scoreThreshold)
        body.score_threshold = options.scoreThreshold;
    if (enableReranking) {
        body.reranker = {
            model: rerankerModel || 'databricks_reranker',
            parameters: {
                columns_to_rerank: columnsToRerank
                    .split(',')
                    .map((col) => col.trim())
                    .filter(Boolean),
            },
        };
    }
    const response = await databricksApiRequest(this, credentialType, {
        method: 'POST',
        url: `${host}/api/2.0/vector-search/indexes/${indexName}/query`,
        body,
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=queryIndex.operation.js.map