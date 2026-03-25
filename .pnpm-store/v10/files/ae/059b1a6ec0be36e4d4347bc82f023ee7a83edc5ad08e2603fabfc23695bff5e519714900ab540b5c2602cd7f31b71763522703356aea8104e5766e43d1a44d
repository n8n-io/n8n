"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLayerIgnored = exports.getMiddlewareMetadata = void 0;
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const types_1 = require("./types");
const AttributeNames_1 = require("./enums/AttributeNames");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const getMiddlewareMetadata = (context, layer, isRouter, layerPath) => {
    if (isRouter) {
        return {
            attributes: {
                [AttributeNames_1.AttributeNames.KOA_NAME]: layerPath?.toString(),
                [AttributeNames_1.AttributeNames.KOA_TYPE]: types_1.KoaLayerType.ROUTER,
                [semantic_conventions_1.ATTR_HTTP_ROUTE]: layerPath?.toString(),
            },
            name: context._matchedRouteName || `router - ${layerPath}`,
        };
    }
    else {
        return {
            attributes: {
                [AttributeNames_1.AttributeNames.KOA_NAME]: layer.name ?? 'middleware',
                [AttributeNames_1.AttributeNames.KOA_TYPE]: types_1.KoaLayerType.MIDDLEWARE,
            },
            name: `middleware - ${layer.name}`,
        };
    }
};
exports.getMiddlewareMetadata = getMiddlewareMetadata;
/**
 * Check whether the given request is ignored by configuration
 * @param [list] List of ignore patterns
 * @param [onException] callback for doing something when an exception has
 *     occurred
 */
const isLayerIgnored = (type, config) => {
    return !!(Array.isArray(config?.ignoreLayersType) &&
        config?.ignoreLayersType?.includes(type));
};
exports.isLayerIgnored = isLayerIgnored;
//# sourceMappingURL=utils.js.map