"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunListResponsesPage = exports.Runs = void 0;
const resource_1 = require("../../../resource.js");
const core_1 = require("../../../core.js");
const OutputItemsAPI = __importStar(require("./output-items.js"));
const output_items_1 = require("./output-items.js");
const pagination_1 = require("../../../pagination.js");
class Runs extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.outputItems = new OutputItemsAPI.OutputItems(this._client);
    }
    /**
     * Kicks off a new run for a given evaluation, specifying the data source, and what
     * model configuration to use to test. The datasource will be validated against the
     * schema specified in the config of the evaluation.
     */
    create(evalId, body, options) {
        return this._client.post(`/evals/${evalId}/runs`, { body, ...options });
    }
    /**
     * Get an evaluation run by ID.
     */
    retrieve(evalId, runId, options) {
        return this._client.get(`/evals/${evalId}/runs/${runId}`, options);
    }
    list(evalId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(evalId, {}, query);
        }
        return this._client.getAPIList(`/evals/${evalId}/runs`, RunListResponsesPage, { query, ...options });
    }
    /**
     * Delete an eval run.
     */
    del(evalId, runId, options) {
        return this._client.delete(`/evals/${evalId}/runs/${runId}`, options);
    }
    /**
     * Cancel an ongoing evaluation run.
     */
    cancel(evalId, runId, options) {
        return this._client.post(`/evals/${evalId}/runs/${runId}`, options);
    }
}
exports.Runs = Runs;
class RunListResponsesPage extends pagination_1.CursorPage {
}
exports.RunListResponsesPage = RunListResponsesPage;
Runs.RunListResponsesPage = RunListResponsesPage;
Runs.OutputItems = output_items_1.OutputItems;
Runs.OutputItemListResponsesPage = output_items_1.OutputItemListResponsesPage;
//# sourceMappingURL=runs.js.map