"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BedrockClient = void 0;
const aws_utils_1 = require("./aws-utils");
const AwsClient_1 = require("./AwsClient");
class BedrockClient extends AwsClient_1.AwsClient {
    constructor(_options) {
        super(Object.assign(Object.assign({}, _options), { fetcher: (0, aws_utils_1.fetchOverride)("bedrock", _options) }));
    }
}
exports.BedrockClient = BedrockClient;
