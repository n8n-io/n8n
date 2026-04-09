"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunStepsPage = exports.Steps = void 0;
const resource_1 = require("../../../../resource.js");
const core_1 = require("../../../../core.js");
const pagination_1 = require("../../../../pagination.js");
/**
 * @deprecated The Assistants API is deprecated in favor of the Responses API
 */
class Steps extends resource_1.APIResource {
    retrieve(threadId, runId, stepId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.retrieve(threadId, runId, stepId, {}, query);
        }
        return this._client.get(`/threads/${threadId}/runs/${runId}/steps/${stepId}`, {
            query,
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
    list(threadId, runId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(threadId, runId, {}, query);
        }
        return this._client.getAPIList(`/threads/${threadId}/runs/${runId}/steps`, RunStepsPage, {
            query,
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
}
exports.Steps = Steps;
class RunStepsPage extends pagination_1.CursorPage {
}
exports.RunStepsPage = RunStepsPage;
Steps.RunStepsPage = RunStepsPage;
//# sourceMappingURL=steps.js.map