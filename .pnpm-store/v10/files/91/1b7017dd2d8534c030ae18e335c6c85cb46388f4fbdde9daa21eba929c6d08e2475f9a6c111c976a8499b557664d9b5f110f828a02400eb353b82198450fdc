// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { formatError } from "./logging.js";
/**
 * @internal
 */
export function checkSubscription(logger, subscription) {
    if (!subscription.match(/^[0-9a-zA-Z-._ ]+$/)) {
        const error = new Error(`Subscription '${subscription}' contains invalid characters. If this is the name of a subscription, use ` +
            `its ID instead. You can locate your subscription by following the instructions listed here: ` +
            `https://learn.microsoft.com/azure/azure-portal/get-subscription-tenant-id`);
        logger.info(formatError("", error));
        throw error;
    }
}
//# sourceMappingURL=subscriptionUtils.js.map