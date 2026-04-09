/**
 * (C) Copyright IBM Corp. 2025-2026.
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
/**
 * Checks if exactly one of the required parameters is provided.
 *
 * @param {Record<string, any>} params - Object containing parameters.
 * @param {string[]} requiredParams - Array of required parameters.
 * @throws {Error} If more than one required parameter is provided or none.
 */
export const validateRequiredOneOf = (params, requiredParams) => {
    const isParam = requiredParams.reduce((acc, curr) => {
        if (params[curr] && !acc)
            return true;
        if (params[curr] && acc)
            throw new Error(`Only one of the following parameters is allowed: ${requiredParams}`);
        return acc;
    }, false);
    if (isParam === false)
        throw new Error(`One of the following parameters is required: ${requiredParams}`);
};
//# sourceMappingURL=utils.mjs.map