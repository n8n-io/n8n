"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagemakerClient = void 0;
const AwsClient_1 = require("./AwsClient");
const aws_utils_1 = require("./aws-utils");
class SagemakerClient extends AwsClient_1.AwsClient {
    constructor(_options) {
        super(Object.assign(Object.assign({}, _options), { fetcher: (0, aws_utils_1.fetchOverride)("sagemaker", _options) }));
    }
}
exports.SagemakerClient = SagemakerClient;
