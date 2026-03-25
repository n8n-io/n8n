"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.K8SMachineWorkflow = void 0;
const promises_1 = require("fs/promises");
const machine_workflow_1 = require("./machine_workflow");
/** The fallback file name */
const FALLBACK_FILENAME = '/var/run/secrets/kubernetes.io/serviceaccount/token';
/** The azure environment variable for the file name. */
const AZURE_FILENAME = 'AZURE_FEDERATED_TOKEN_FILE';
/** The AWS environment variable for the file name. */
const AWS_FILENAME = 'AWS_WEB_IDENTITY_TOKEN_FILE';
class K8SMachineWorkflow extends machine_workflow_1.MachineWorkflow {
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
        let filename;
        if (process.env[AZURE_FILENAME]) {
            filename = process.env[AZURE_FILENAME];
        }
        else if (process.env[AWS_FILENAME]) {
            filename = process.env[AWS_FILENAME];
        }
        else {
            filename = FALLBACK_FILENAME;
        }
        const token = await (0, promises_1.readFile)(filename, 'utf8');
        return { access_token: token };
    }
}
exports.K8SMachineWorkflow = K8SMachineWorkflow;
//# sourceMappingURL=k8s_machine_workflow.js.map