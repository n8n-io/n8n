"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSubscription = checkSubscription;
const logging_js_1 = require("./logging.js");
/**
 * @internal
 */
function checkSubscription(logger, subscription) {
    if (!subscription.match(/^[0-9a-zA-Z-._ ]+$/)) {
        const error = new Error(`Subscription '${subscription}' contains invalid characters. If this is the name of a subscription, use ` +
            `its ID instead. You can locate your subscription by following the instructions listed here: ` +
            `https://learn.microsoft.com/azure/azure-portal/get-subscription-tenant-id`);
        logger.info((0, logging_js_1.formatError)("", error));
        throw error;
    }
}
//# sourceMappingURL=subscriptionUtils.js.map