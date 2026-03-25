"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginFromInput = exports.getExtMetadata = exports.getRouteMetadata = exports.isPatchableExtMethod = exports.isDirectExtInput = exports.isLifecycleExtEventObj = exports.isLifecycleExtType = exports.getPluginName = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const internal_types_1 = require("./internal-types");
const AttributeNames_1 = require("./enums/AttributeNames");
const instrumentation_1 = require("@opentelemetry/instrumentation");
function getPluginName(plugin) {
    if (plugin.name) {
        return plugin.name;
    }
    else {
        return plugin.pkg.name;
    }
}
exports.getPluginName = getPluginName;
const isLifecycleExtType = (variableToCheck) => {
    return (typeof variableToCheck === 'string' &&
        internal_types_1.HapiLifecycleMethodNames.has(variableToCheck));
};
exports.isLifecycleExtType = isLifecycleExtType;
const isLifecycleExtEventObj = (variableToCheck) => {
    const event = variableToCheck?.type;
    return event !== undefined && (0, exports.isLifecycleExtType)(event);
};
exports.isLifecycleExtEventObj = isLifecycleExtEventObj;
const isDirectExtInput = (variableToCheck) => {
    return (Array.isArray(variableToCheck) &&
        variableToCheck.length <= 3 &&
        (0, exports.isLifecycleExtType)(variableToCheck[0]) &&
        typeof variableToCheck[1] === 'function');
};
exports.isDirectExtInput = isDirectExtInput;
const isPatchableExtMethod = (variableToCheck) => {
    return !Array.isArray(variableToCheck);
};
exports.isPatchableExtMethod = isPatchableExtMethod;
const getRouteMetadata = (route, semconvStability, pluginName) => {
    const attributes = {
        [semantic_conventions_1.ATTR_HTTP_ROUTE]: route.path,
    };
    if (semconvStability & instrumentation_1.SemconvStability.OLD) {
        attributes[semconv_1.ATTR_HTTP_METHOD] = route.method;
    }
    if (semconvStability & instrumentation_1.SemconvStability.STABLE) {
        // Note: This currently does *not* normalize the method name to uppercase
        // and conditionally include `http.request.method.original` as described
        // at https://opentelemetry.io/docs/specs/semconv/http/http-spans/
        // These attributes are for a *hapi* span, and not the parent HTTP span,
        // so the HTTP span guidance doesn't strictly apply.
        attributes[semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD] = route.method;
    }
    let name;
    if (pluginName) {
        attributes[AttributeNames_1.AttributeNames.HAPI_TYPE] = internal_types_1.HapiLayerType.PLUGIN;
        attributes[AttributeNames_1.AttributeNames.PLUGIN_NAME] = pluginName;
        name = `${pluginName}: route - ${route.path}`;
    }
    else {
        attributes[AttributeNames_1.AttributeNames.HAPI_TYPE] = internal_types_1.HapiLayerType.ROUTER;
        name = `route - ${route.path}`;
    }
    return { attributes, name };
};
exports.getRouteMetadata = getRouteMetadata;
const getExtMetadata = (extPoint, pluginName) => {
    if (pluginName) {
        return {
            attributes: {
                [AttributeNames_1.AttributeNames.EXT_TYPE]: extPoint,
                [AttributeNames_1.AttributeNames.HAPI_TYPE]: internal_types_1.HapiLayerType.EXT,
                [AttributeNames_1.AttributeNames.PLUGIN_NAME]: pluginName,
            },
            name: `${pluginName}: ext - ${extPoint}`,
        };
    }
    return {
        attributes: {
            [AttributeNames_1.AttributeNames.EXT_TYPE]: extPoint,
            [AttributeNames_1.AttributeNames.HAPI_TYPE]: internal_types_1.HapiLayerType.EXT,
        },
        name: `ext - ${extPoint}`,
    };
};
exports.getExtMetadata = getExtMetadata;
const getPluginFromInput = (pluginObj) => {
    if ('plugin' in pluginObj) {
        if ('plugin' in pluginObj.plugin) {
            return pluginObj.plugin.plugin;
        }
        return pluginObj.plugin;
    }
    return pluginObj;
};
exports.getPluginFromInput = getPluginFromInput;
//# sourceMappingURL=utils.js.map