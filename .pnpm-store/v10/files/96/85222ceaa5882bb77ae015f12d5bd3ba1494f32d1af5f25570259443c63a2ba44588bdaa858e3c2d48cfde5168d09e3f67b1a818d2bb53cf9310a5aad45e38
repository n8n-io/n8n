"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryModesZodSchema = exports.DeliveryModes = void 0;
const zod_1 = require("zod");
/**
 * Enum representing delivery modes.
 */
var DeliveryModes;
(function (DeliveryModes) {
    /**
     * Represents the normal delivery mode.
     */
    DeliveryModes["Normal"] = "normal";
    /**
     * Represents a notification delivery mode.
     */
    DeliveryModes["Notification"] = "notification";
    /**
     * Represents a delivery mode where replies are expected.
     */
    DeliveryModes["ExpectReplies"] = "expectReplies";
    /**
     * Represents an ephemeral delivery mode.
     */
    DeliveryModes["Ephemeral"] = "ephemeral";
})(DeliveryModes || (exports.DeliveryModes = DeliveryModes = {}));
/**
 * Zod schema for validating a DeliveryModes enum.
 */
exports.deliveryModesZodSchema = zod_1.z.enum(['normal', 'notification', 'expectReplies', 'ephemeral']);
//# sourceMappingURL=deliveryModes.js.map