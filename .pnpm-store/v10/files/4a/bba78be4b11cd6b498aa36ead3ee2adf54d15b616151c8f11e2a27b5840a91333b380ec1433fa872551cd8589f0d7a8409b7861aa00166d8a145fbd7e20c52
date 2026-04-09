"use strict";
/**
 * (C) Copyright IBM Corp. 2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestParams = void 0;
const ibm_cloud_sdk_core_1 = require("ibm-cloud-sdk-core");
/**
 * Validates parameters including common parameters (signal, headers). This is a wrapper around
 * validateParams that automatically includes common parameters.
 *
 * @param {Record<string, any>} params - Object containing parameters to validate.
 * @param {string[] | null} requiredParams - Array of required parameter names, or null if no
 *   required params.
 * @param {string[] | null} validParams - Array of valid parameter names (common params will be
 *   added automatically), or null if no valid params.
 * @returns {Error | null} Returns an Error object if validation fails, null otherwise.
 */
const validateRequestParams = (params, requiredParams, validParams) => {
    const commonParams = ['headers', 'signal'];
    const validParamsWithCommon = [...commonParams];
    if (requiredParams)
        validParamsWithCommon.push(...requiredParams);
    if (validParams)
        validParamsWithCommon.push(...validParams);
    // @ts-expect-error validateParams has invalid typing
    return (0, ibm_cloud_sdk_core_1.validateParams)(params, requiredParams, validParamsWithCommon);
};
exports.validateRequestParams = validateRequestParams;
//# sourceMappingURL=validators.js.map