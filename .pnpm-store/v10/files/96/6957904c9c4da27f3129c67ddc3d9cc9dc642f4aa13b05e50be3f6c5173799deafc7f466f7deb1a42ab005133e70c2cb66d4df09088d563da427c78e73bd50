"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputItemListResponsesPage = exports.OutputItems = void 0;
const resource_1 = require("../../../resource.js");
const core_1 = require("../../../core.js");
const pagination_1 = require("../../../pagination.js");
class OutputItems extends resource_1.APIResource {
    /**
     * Get an evaluation run output item by ID.
     */
    retrieve(evalId, runId, outputItemId, options) {
        return this._client.get(`/evals/${evalId}/runs/${runId}/output_items/${outputItemId}`, options);
    }
    list(evalId, runId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(evalId, runId, {}, query);
        }
        return this._client.getAPIList(`/evals/${evalId}/runs/${runId}/output_items`, OutputItemListResponsesPage, { query, ...options });
    }
}
exports.OutputItems = OutputItems;
class OutputItemListResponsesPage extends pagination_1.CursorPage {
}
exports.OutputItemListResponsesPage = OutputItemListResponsesPage;
OutputItems.OutputItemListResponsesPage = OutputItemListResponsesPage;
//# sourceMappingURL=output-items.js.map