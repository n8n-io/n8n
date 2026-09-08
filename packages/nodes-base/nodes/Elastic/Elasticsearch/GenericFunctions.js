import { NodeApiError } from 'n8n-workflow';
import { toPathSegment } from '@utils/url';
export async function elasticsearchBulkApiRequest(body) {
    const { baseUrl, ignoreSSLIssues } = await this.getCredentials('elasticsearchApi');
    const bulkBody = Object.values(body).flat().join('\n') + '\n';
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: bulkBody,
        url: `${baseUrl.replace(/\/$/, '')}/_bulk`,
        skipSslCertificateValidation: ignoreSSLIssues,
        returnFullResponse: true,
        ignoreHttpStatusErrors: true,
    };
    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'elasticsearchApi', options);
    if (response.statusCode > 299) {
        if (this.continueOnFail()) {
            return Object.values(body).map((_) => ({ error: response.body.error }));
        }
        else {
            throw new NodeApiError(this.getNode(), { error: response.body.error });
        }
    }
    return response.body.items.map((item) => {
        return {
            ...item.index,
            ...item.update,
            ...item.create,
            ...item.delete,
            ...item.error,
        };
    });
}
export async function elasticsearchApiRequest(method, endpoint, body = {}, qs = {}) {
    const { baseUrl, ignoreSSLIssues } = await this.getCredentials('elasticsearchApi');
    const options = {
        method,
        body,
        qs,
        url: `${baseUrl.replace(/\/$/, '')}${endpoint}`,
        json: true,
        skipSslCertificateValidation: ignoreSSLIssues,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'elasticsearchApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function elasticsearchApiRequestAllItems(indexId, body = {}, qs = {}) {
    //https://www.elastic.co/guide/en/elasticsearch/reference/7.16/paginate-search-results.html#search-after
    // Validated up front so an invalid id surfaces as itself rather than being
    // caught below and rewrapped as an Elasticsearch API failure.
    const indexSegment = toPathSegment(indexId);
    try {
        //create a point in time (PIT) to preserve the current index state over your searches
        let pit = (await elasticsearchApiRequest.call(this, 'POST', `/${indexSegment}/_pit`, {}, { keep_alive: '1m' }))?.id;
        let returnData = [];
        let responseData;
        let searchAfter = [];
        const requestBody = {
            ...body,
            size: 10000,
            pit: {
                id: pit,
                keep_alive: '1m',
            },
            track_total_hits: false, //Disable the tracking of total hits to speed up pagination
        };
        responseData = await elasticsearchApiRequest.call(this, 'POST', '/_search', requestBody, qs);
        if (responseData?.hits?.hits) {
            returnData = returnData.concat(responseData.hits.hits);
            const lastHitIndex = responseData.hits.hits.length - 1;
            //Sort values for the last returned hit with the tiebreaker value
            searchAfter = responseData.hits.hits[lastHitIndex].sort;
            //Update id for the point in time
            pit = responseData.pit_id;
        }
        else {
            return [];
        }
        while (true) {
            requestBody.search_after = searchAfter;
            requestBody.pit = { id: pit, keep_alive: '1m' };
            responseData = await elasticsearchApiRequest.call(this, 'POST', '/_search', requestBody, qs);
            if (responseData?.hits?.hits?.length) {
                returnData = returnData.concat(responseData.hits.hits);
                const lastHitIndex = responseData.hits.hits.length - 1;
                searchAfter = responseData.hits.hits[lastHitIndex].sort;
                pit = responseData.pit_id;
            }
            else {
                break;
            }
        }
        await elasticsearchApiRequest.call(this, 'DELETE', '/_pit', { id: pit });
        return returnData;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map