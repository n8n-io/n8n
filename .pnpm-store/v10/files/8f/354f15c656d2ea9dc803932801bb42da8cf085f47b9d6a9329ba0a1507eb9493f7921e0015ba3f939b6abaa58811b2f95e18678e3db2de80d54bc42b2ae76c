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
exports.FineTuning = void 0;
const resource_1 = require("../../resource.js");
const MethodsAPI = __importStar(require("./methods.js"));
const methods_1 = require("./methods.js");
const AlphaAPI = __importStar(require("./alpha/alpha.js"));
const alpha_1 = require("./alpha/alpha.js");
const CheckpointsAPI = __importStar(require("./checkpoints/checkpoints.js"));
const checkpoints_1 = require("./checkpoints/checkpoints.js");
const JobsAPI = __importStar(require("./jobs/jobs.js"));
const jobs_1 = require("./jobs/jobs.js");
class FineTuning extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.methods = new MethodsAPI.Methods(this._client);
        this.jobs = new JobsAPI.Jobs(this._client);
        this.checkpoints = new CheckpointsAPI.Checkpoints(this._client);
        this.alpha = new AlphaAPI.Alpha(this._client);
    }
}
exports.FineTuning = FineTuning;
FineTuning.Methods = methods_1.Methods;
FineTuning.Jobs = jobs_1.Jobs;
FineTuning.FineTuningJobsPage = jobs_1.FineTuningJobsPage;
FineTuning.FineTuningJobEventsPage = jobs_1.FineTuningJobEventsPage;
FineTuning.Checkpoints = checkpoints_1.Checkpoints;
FineTuning.Alpha = alpha_1.Alpha;
//# sourceMappingURL=fine-tuning.js.map