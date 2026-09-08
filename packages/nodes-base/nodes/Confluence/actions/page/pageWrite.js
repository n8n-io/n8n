import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { confluenceApiRequest } from '../../transport';
export async function fetchPageForWrite(itemIndex, pageId, bodyFormat) {
    const qs = {};
    if (bodyFormat !== undefined)
        qs['body-format'] = bodyFormat;
    const page = await confluenceApiRequest.call(this, 'GET', `/wiki/api/v2/pages/${encodeURIComponent(pageId)}`, {}, qs);
    const status = typeof page.status === 'string' ? page.status : 'unknown';
    if (status !== 'current' && status !== 'draft') {
        throw new NodeOperationError(this.getNode(), `The page cannot be changed because its status is "${status}"`, {
            itemIndex,
            description: 'Only pages with "current" or "draft" status can be written to. Restore the page in Confluence first, then run this operation again.',
        });
    }
    const versionNumber = page.version?.number;
    if (typeof versionNumber !== 'number') {
        throw new NodeOperationError(this.getNode(), 'Could not read the current version of the page', {
            itemIndex,
        });
    }
    let bodyValue = '';
    if (bodyFormat !== undefined) {
        const bodyEnvelope = page.body?.[bodyFormat];
        // Empty pages still return value: '' — a missing value must not be
        // mistaken for one, or the write would overwrite the page
        if (typeof bodyEnvelope?.value !== 'string') {
            throw new NodeOperationError(this.getNode(), 'Could not read the current content of the page', {
                itemIndex,
                description: `The API response did not include the page body in the "${bodyFormat}" format. The page was not changed.`,
            });
        }
        bodyValue = bodyEnvelope.value;
    }
    return {
        status,
        title: typeof page.title === 'string' ? page.title : '',
        versionNumber,
        bodyValue,
    };
}
export async function putPage(itemIndex, pageId, snapshot, title, body, status = snapshot.status) {
    const payload = {
        id: pageId,
        status,
        title,
        body,
        // Drafts are single-version and require version 1; only published-to-published
        // writes increment. See https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-put
        version: {
            number: status === 'draft' || snapshot.status === 'draft' ? 1 : snapshot.versionNumber + 1,
        },
    };
    try {
        return await confluenceApiRequest.call(this, 'PUT', `/wiki/api/v2/pages/${encodeURIComponent(pageId)}`, payload);
    }
    catch (error) {
        if (error instanceof NodeApiError && error.httpCode === '409') {
            throw new NodeOperationError(this.getNode(), 'The page was modified concurrently', {
                itemIndex,
                description: 'Someone else changed the page between this operation reading it and saving it. Nothing was overwritten — run the node again to apply the change to the latest version of the page.',
            });
        }
        throw error;
    }
}
//# sourceMappingURL=pageWrite.js.map