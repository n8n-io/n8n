"use strict";
/**
 * @license
 * Copyright 2018 gRPC authors.
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
exports.addCommonProtos = exports.loadProtosWithOptionsSync = exports.loadProtosWithOptions = void 0;
const fs = require("fs");
const path = require("path");
const Protobuf = require("protobufjs");
function addIncludePathResolver(root, includePaths) {
    const originalResolvePath = root.resolvePath;
    root.resolvePath = (origin, target) => {
        if (path.isAbsolute(target)) {
            return target;
        }
        for (const directory of includePaths) {
            const fullPath = path.join(directory, target);
            try {
                fs.accessSync(fullPath, fs.constants.R_OK);
                return fullPath;
            }
            catch (err) {
                continue;
            }
        }
        process.emitWarning(`${target} not found in any of the include paths ${includePaths}`);
        return originalResolvePath(origin, target);
    };
}
async function loadProtosWithOptions(filename, options) {
    const root = new Protobuf.Root();
    options = options || {};
    if (!!options.includeDirs) {
        if (!Array.isArray(options.includeDirs)) {
            return Promise.reject(new Error('The includeDirs option must be an array'));
        }
        addIncludePathResolver(root, options.includeDirs);
    }
    const loadedRoot = await root.load(filename, options);
    loadedRoot.resolveAll();
    return loadedRoot;
}
exports.loadProtosWithOptions = loadProtosWithOptions;
function loadProtosWithOptionsSync(filename, options) {
    const root = new Protobuf.Root();
    options = options || {};
    if (!!options.includeDirs) {
        if (!Array.isArray(options.includeDirs)) {
            throw new Error('The includeDirs option must be an array');
        }
        addIncludePathResolver(root, options.includeDirs);
    }
    const loadedRoot = root.loadSync(filename, options);
    loadedRoot.resolveAll();
    return loadedRoot;
}
exports.loadProtosWithOptionsSync = loadProtosWithOptionsSync;
/**
 * Load Google's well-known proto files that aren't exposed by Protobuf.js.
 */
function addCommonProtos() {
    // Protobuf.js exposes: any, duration, empty, field_mask, struct, timestamp,
    // and wrappers. compiler/plugin is excluded in Protobuf.js and here.
    // Using constant strings for compatibility with tools like Webpack
    const apiDescriptor = require('protobufjs/google/protobuf/api.json');
    const descriptorDescriptor = require('protobufjs/google/protobuf/descriptor.json');
    const sourceContextDescriptor = require('protobufjs/google/protobuf/source_context.json');
    const typeDescriptor = require('protobufjs/google/protobuf/type.json');
    Protobuf.common('api', apiDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common('descriptor', descriptorDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common('source_context', sourceContextDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common('type', typeDescriptor.nested.google.nested.protobuf.nested);
}
exports.addCommonProtos = addCommonProtos;
//# sourceMappingURL=util.js.map