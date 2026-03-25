// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RecoverDeletedSecretPollOperation, } from "./operation";
import { KeyVaultSecretPoller } from "../keyVaultSecretPoller";
/**
 * Class that deletes a poller that waits until a secret finishes being deleted
 */
export class RecoverDeletedSecretPoller extends KeyVaultSecretPoller {
    constructor(options) {
        const { vaultUrl, client, name, operationOptions, intervalInMs = 2000, resumeFrom } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = new RecoverDeletedSecretPollOperation(Object.assign(Object.assign({}, state), { name }), vaultUrl, client, operationOptions);
        super(operation);
        this.intervalInMs = intervalInMs;
    }
}
//# sourceMappingURL=poller.js.map