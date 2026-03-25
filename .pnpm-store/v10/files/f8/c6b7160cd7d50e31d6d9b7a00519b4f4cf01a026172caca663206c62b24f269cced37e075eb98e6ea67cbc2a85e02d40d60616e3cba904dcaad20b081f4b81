"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProductInfoToActivity = exports.clearProductInfoFromActivity = void 0;
/**
 * Remove any ProductInfo entities from the activity
 * @param activity
 */
const clearProductInfoFromActivity = (activity) => {
    if (activity && activity.entities && activity.entities.length) {
        activity.entities = activity.entities.filter(e => e.type !== 'ProductInfo');
    }
};
exports.clearProductInfoFromActivity = clearProductInfoFromActivity;
/**
 * Add a new ProductInfo entity to the activity and ensure only one exists
 * @param activity
 * @param id
 */
const addProductInfoToActivity = (activity, id) => {
    var _a, _b;
    const productInfo = {
        type: 'ProductInfo',
        id
    };
    (_a = activity.entities) !== null && _a !== void 0 ? _a : (activity.entities = []);
    (0, exports.clearProductInfoFromActivity)(activity);
    (_b = activity.entities) === null || _b === void 0 ? void 0 : _b.push(productInfo);
};
exports.addProductInfoToActivity = addProductInfoToActivity;
//# sourceMappingURL=productInfo.js.map