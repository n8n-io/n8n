// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { DeleteSecretPollOperation } from "./operation";
import { KeyVaultSecretPoller } from "../keyVaultSecretPoller";
/**
 * Class that creates a poller that waits until a secret finishes being deleted.
 */
export class DeleteSecretPoller extends KeyVaultSecretPoller {
    constructor(options) {
        const { vaultUrl, client, name, operationOptions, intervalInMs = 2000, resumeFrom } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = new DeleteSecretPollOperation(Object.assign(Object.assign({}, state), { name }), vaultUrl, client, operationOptions);
        super(operation);
        this.intervalInMs = intervalInMs;
    }
}
//# sourceMappingURL=poller.js.map