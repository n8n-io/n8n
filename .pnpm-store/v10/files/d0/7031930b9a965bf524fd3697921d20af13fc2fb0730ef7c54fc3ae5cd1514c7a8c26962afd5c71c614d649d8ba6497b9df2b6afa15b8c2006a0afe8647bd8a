"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FineTuningJobCheckpointsPage = exports.Checkpoints = void 0;
const resource_1 = require("../../../resource.js");
const core_1 = require("../../../core.js");
const pagination_1 = require("../../../pagination.js");
class Checkpoints extends resource_1.APIResource {
    list(fineTuningJobId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(fineTuningJobId, {}, query);
        }
        return this._client.getAPIList(`/fine_tuning/jobs/${fineTuningJobId}/checkpoints`, FineTuningJobCheckpointsPage, { query, ...options });
    }
}
exports.Checkpoints = Checkpoints;
class FineTuningJobCheckpointsPage extends pagination_1.CursorPage {
}
exports.FineTuningJobCheckpointsPage = FineTuningJobCheckpointsPage;
Checkpoints.FineTuningJobCheckpointsPage = FineTuningJobCheckpointsPage;
//# sourceMappingURL=checkpoints.js.map