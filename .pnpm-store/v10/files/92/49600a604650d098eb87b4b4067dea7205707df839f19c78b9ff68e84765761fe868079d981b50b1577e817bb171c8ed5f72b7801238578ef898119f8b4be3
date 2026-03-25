// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { DeleteKeyPollOperation } from "./operation";
import { KeyVaultKeyPoller } from "../keyVaultKeyPoller";
/**
 * Class that creates a poller that waits until a key finishes being deleted.
 */
export class DeleteKeyPoller extends KeyVaultKeyPoller {
    constructor(options) {
        const { vaultUrl, client, name, operationOptions, intervalInMs = 2000, resumeFrom } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = new DeleteKeyPollOperation(Object.assign(Object.assign({}, state), { name }), vaultUrl, client, operationOptions);
        super(operation);
        this.intervalInMs = intervalInMs;
    }
}
//# sourceMappingURL=poller.js.map