"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureMachineWorkflow = void 0;
const azure_1 = require("../../../client-side-encryption/providers/azure");
const error_1 = require("../../../error");
const utils_1 = require("../../../utils");
const machine_workflow_1 = require("./machine_workflow");
/** Azure request headers. */
const AZURE_HEADERS = Object.freeze({ Metadata: 'true', Accept: 'application/json' });
/** Invalid endpoint result error. */
const ENDPOINT_RESULT_ERROR = 'Azure endpoint did not return a value with only access_token and expires_in properties';
/** Error for when the token audience is missing in the environment. */
const TOKEN_RESOURCE_MISSING_ERROR = 'TOKEN_RESOURCE must be set in the auth mechanism properties when ENVIRONMENT is azure.';
/**
 * Device workflow implementation for Azure.
 *
 * @internal
 */
class AzureMachineWorkflow extends machine_workflow_1.MachineWorkflow {
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
        const username = credentials?.username;
        if (!tokenAudience) {
            throw new error_1.MongoAzureError(TOKEN_RESOURCE_MISSING_ERROR);
        }
        const response = await getAzureTokenData(tokenAudience, username);
        if (!isEndpointResultValid(response)) {
            throw new error_1.MongoAzureError(ENDPOINT_RESULT_ERROR);
        }
        return response;
    }
}
exports.AzureMachineWorkflow = AzureMachineWorkflow;
/**
 * Hit the Azure endpoint to get the token data.
 */
async function getAzureTokenData(tokenAudience, username) {
    const url = new URL(azure_1.AZURE_BASE_URL);
    (0, azure_1.addAzureParams)(url, tokenAudience, username);
    const response = await (0, utils_1.get)(url, {
        headers: AZURE_HEADERS
    });
    if (response.status !== 200) {
        throw new error_1.MongoAzureError(`Status code ${response.status} returned from the Azure endpoint. Response body: ${response.body}`);
    }
    const result = JSON.parse(response.body);
    return {
        access_token: result.access_token,
        expires_in: Number(result.expires_in)
    };
}
/**
 * Determines if a result returned from the endpoint is valid.
 * This means the result is not nullish, contains the access_token required field
 * and the expires_in required field.
 */
function isEndpointResultValid(token) {
    if (token == null || typeof token !== 'object')
        return false;
    return ('access_token' in token &&
        typeof token.access_token === 'string' &&
        'expires_in' in token &&
        typeof token.expires_in === 'number');
}
//# sourceMappingURL=azure_machine_workflow.js.map