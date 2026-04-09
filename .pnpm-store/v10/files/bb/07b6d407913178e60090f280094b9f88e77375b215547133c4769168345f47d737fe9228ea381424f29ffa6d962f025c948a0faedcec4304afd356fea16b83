"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseItemsPage = exports.InputItems = void 0;
const resource_1 = require("../../resource.js");
const core_1 = require("../../core.js");
const responses_1 = require("./responses.js");
Object.defineProperty(exports, "ResponseItemsPage", { enumerable: true, get: function () { return responses_1.ResponseItemsPage; } });
class InputItems extends resource_1.APIResource {
    list(responseId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(responseId, {}, query);
        }
        return this._client.getAPIList(`/responses/${responseId}/input_items`, responses_1.ResponseItemsPage, {
            query,
            ...options,
        });
    }
}
exports.InputItems = InputItems;
//# sourceMappingURL=input-items.js.map