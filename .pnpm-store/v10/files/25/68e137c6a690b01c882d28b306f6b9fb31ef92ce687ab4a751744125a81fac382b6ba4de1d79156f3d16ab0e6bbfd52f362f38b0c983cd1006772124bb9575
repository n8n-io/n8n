"use strict";
/*
 * Copyright 2019 gRPC authors.
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
exports.CIPHER_SUITES = void 0;
exports.getDefaultRootsData = getDefaultRootsData;
const fs = require("fs");
exports.CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES;
const DEFAULT_ROOTS_FILE_PATH = process.env.GRPC_DEFAULT_SSL_ROOTS_FILE_PATH;
let defaultRootsData = null;
function getDefaultRootsData() {
    if (DEFAULT_ROOTS_FILE_PATH) {
        if (defaultRootsData === null) {
            defaultRootsData = fs.readFileSync(DEFAULT_ROOTS_FILE_PATH);
        }
        return defaultRootsData;
    }
    return null;
}
//# sourceMappingURL=tls-helpers.js.map