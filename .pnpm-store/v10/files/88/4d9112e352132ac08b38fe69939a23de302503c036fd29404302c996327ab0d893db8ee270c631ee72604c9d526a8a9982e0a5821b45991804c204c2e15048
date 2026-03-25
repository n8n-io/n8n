"use strict";
// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.Gaxios = exports.GaxiosError = void 0;
exports.request = request;
const gaxios_js_1 = require("./gaxios.js");
Object.defineProperty(exports, "Gaxios", { enumerable: true, get: function () { return gaxios_js_1.Gaxios; } });
var common_js_1 = require("./common.js");
Object.defineProperty(exports, "GaxiosError", { enumerable: true, get: function () { return common_js_1.GaxiosError; } });
__exportStar(require("./interceptor.js"), exports);
/**
 * The default instance used when the `request` method is directly
 * invoked.
 */
exports.instance = new gaxios_js_1.Gaxios();
/**
 * Make an HTTP request using the given options.
 * @param opts Options for the request
 */
async function request(opts) {
    return exports.instance.request(opts);
}
//# sourceMappingURL=index.js.map