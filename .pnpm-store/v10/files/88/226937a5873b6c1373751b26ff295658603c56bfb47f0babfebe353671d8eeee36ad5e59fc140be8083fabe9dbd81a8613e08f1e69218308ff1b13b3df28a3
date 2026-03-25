"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCPMachineWorkflow = void 0;
const error_1 = require("../../../error");
const utils_1 = require("../../../utils");
const machine_workflow_1 = require("./machine_workflow");
/** GCP base URL. */
const GCP_BASE_URL = 'http://metadata/computeMetadata/v1/instance/service-accounts/default/identity';
/** GCP request headers. */
const GCP_HEADERS = Object.freeze({ 'Metadata-Flavor': 'Google' });
/** Error for when the token audience is missing in the environment. */
const TOKEN_RESOURCE_MISSING_ERROR = 'TOKEN_RESOURCE must be set in the auth mechanism properties when ENVIRONMENT is gcp.';
class GCPMachineWorkflow extends machine_workflow_1.MachineWorkflow {
    /**
     * Instantiate the machine workflow.
     */
    constructor(cache) {
        super(cache);
    }
    /**
     * Get the token from the environment.
     */
    async getToken(credentials) {
        const tokenAudience = credentials?.mechanismProperties.TOKEN_RESOURCE;
        if (!tokenAudience) {
            throw new error_1.MongoGCPError(TOKEN_RESOURCE_MISSING_ERROR);
        }
        return await getGcpTokenData(tokenAudience);
    }
}
exports.GCPMachineWorkflow = GCPMachineWorkflow;
/**
 * Hit the GCP endpoint to get the token data.
 */
async function getGcpTokenData(tokenAudience) {
    const url = new URL(GCP_BASE_URL);
    url.searchParams.append('audience', tokenAudience);
    const response = await (0, utils_1.get)(url, {
        headers: GCP_HEADERS
    });
    if (response.status !== 200) {
        throw new error_1.MongoGCPError(`Status code ${response.status} returned from the GCP endpoint. Response body: ${response.body}`);
    }
    return { access_token: response.body };
}
//# sourceMappingURL=gcp_machine_workflow.js.map