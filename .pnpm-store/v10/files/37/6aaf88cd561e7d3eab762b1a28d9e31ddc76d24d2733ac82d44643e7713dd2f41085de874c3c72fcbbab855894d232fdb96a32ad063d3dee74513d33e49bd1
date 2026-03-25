// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { StorageRetryPolicy, StorageRetryPolicyType } from "./policies/StorageRetryPolicy";
export { StorageRetryPolicyType, StorageRetryPolicy };
/**
 * StorageRetryPolicyFactory is a factory class helping generating {@link StorageRetryPolicy} objects.
 */
export class StorageRetryPolicyFactory {
    /**
     * Creates an instance of StorageRetryPolicyFactory.
     * @param retryOptions -
     */
    constructor(retryOptions) {
        this.retryOptions = retryOptions;
    }
    /**
     * Creates a StorageRetryPolicy object.
     *
     * @param nextPolicy -
     * @param options -
     */
    create(nextPolicy, options) {
        return new StorageRetryPolicy(nextPolicy, options, this.retryOptions);
    }
}
//# sourceMappingURL=StorageRetryPolicyFactory.js.map