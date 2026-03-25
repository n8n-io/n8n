"use strict";
/*
 * Copyright 2022 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.getErrorCode = getErrorCode;
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    else {
        return String(error);
    }
}
function getErrorCode(error) {
    if (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'number') {
        return error.code;
    }
    else {
        return null;
    }
}
//# sourceMappingURL=error.js.map