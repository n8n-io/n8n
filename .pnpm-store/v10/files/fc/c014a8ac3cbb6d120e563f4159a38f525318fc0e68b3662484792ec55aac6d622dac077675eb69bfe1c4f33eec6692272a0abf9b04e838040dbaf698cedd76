// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RecoverDeletedKeyPollOperation } from "./operation";
import { KeyVaultKeyPoller } from "../keyVaultKeyPoller";
/**
 * Class that deletes a poller that waits until a key finishes being deleted
 */
export class RecoverDeletedKeyPoller extends KeyVaultKeyPoller {
    constructor(options) {
        const { vaultUrl, client, name, operationOptions, intervalInMs = 2000, resumeFrom } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = new RecoverDeletedKeyPollOperation(Object.assign(Object.assign({}, state), { name }), vaultUrl, client, operationOptions);
        super(operation);
        this.intervalInMs = intervalInMs;
    }
}
//# sourceMappingURL=poller.js.map