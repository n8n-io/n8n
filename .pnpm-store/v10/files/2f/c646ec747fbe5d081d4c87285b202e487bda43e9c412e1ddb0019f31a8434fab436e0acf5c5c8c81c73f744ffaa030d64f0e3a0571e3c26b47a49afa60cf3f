"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenMachineWorkflow = void 0;
const fs = require("fs");
const error_1 = require("../../../error");
const machine_workflow_1 = require("./machine_workflow");
/** Error for when the token is missing in the environment. */
const TOKEN_MISSING_ERROR = 'OIDC_TOKEN_FILE must be set in the environment.';
/**
 * Device workflow implementation for AWS.
 *
 * @internal
 */
class TokenMachineWorkflow extends machine_workflow_1.MachineWorkflow {
    /**
     * Instantiate the machine workflow.
     */
    constructor(cache) {
        super(cache);
    }
    /**
     * Get the token from the environment.
     */
    async getToken() {
        const tokenFile = process.env.OIDC_TOKEN_FILE;
        if (!tokenFile) {
            throw new error_1.MongoAWSError(TOKEN_MISSING_ERROR);
        }
        const token = await fs.promises.readFile(tokenFile, 'utf8');
        return { access_token: token };
    }
}
exports.TokenMachineWorkflow = TokenMachineWorkflow;
//# sourceMappingURL=token_machine_workflow.js.map