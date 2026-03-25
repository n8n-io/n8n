"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsClient = void 0;
const Client_1 = require("./Client");
class AwsClient extends Client_1.CohereClient {
    constructor(_options) {
        _options.token = "n/a"; // AWS clients don't need a token but setting to this to a string so Fern doesn't complain
        super(_options);
    }
}
exports.AwsClient = AwsClient;
