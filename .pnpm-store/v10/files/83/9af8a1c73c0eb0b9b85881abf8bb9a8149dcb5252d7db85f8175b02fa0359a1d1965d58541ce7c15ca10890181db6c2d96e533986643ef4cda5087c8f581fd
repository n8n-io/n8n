// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../resource.mjs";
import { isRequestOptions } from "../../../core.mjs";
import { CursorPage } from "../../../pagination.mjs";
export class OutputItems extends APIResource {
    /**
     * Get an evaluation run output item by ID.
     */
    retrieve(evalId, runId, outputItemId, options) {
        return this._client.get(`/evals/${evalId}/runs/${runId}/output_items/${outputItemId}`, options);
    }
    list(evalId, runId, query = {}, options) {
        if (isRequestOptions(query)) {
            return this.list(evalId, runId, {}, query);
        }
        return this._client.getAPIList(`/evals/${evalId}/runs/${runId}/output_items`, OutputItemListResponsesPage, { query, ...options });
    }
}
export class OutputItemListResponsesPage extends CursorPage {
}
OutputItems.OutputItemListResponsesPage = OutputItemListResponsesPage;
//# sourceMappingURL=output-items.mjs.map