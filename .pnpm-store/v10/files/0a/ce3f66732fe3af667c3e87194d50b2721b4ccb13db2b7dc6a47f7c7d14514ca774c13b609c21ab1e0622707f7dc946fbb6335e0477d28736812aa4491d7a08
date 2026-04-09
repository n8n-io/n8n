"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeFolder = getHomeFolder;
const path = __importStar(require("node:path"));
const FileSystem_1 = require("../FileSystem");
let _cachedHomeFolder;
/**
 * Returns the current user's home folder path.
 * Throws if it cannot be determined. Successful results are cached.
 * @public
 */
function getHomeFolder() {
    if (_cachedHomeFolder !== undefined) {
        return _cachedHomeFolder;
    }
    const unresolvedUserFolder = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    const dirError = "Unable to determine the current user's home directory";
    if (unresolvedUserFolder === undefined) {
        throw new Error(dirError);
    }
    const homeFolder = path.resolve(unresolvedUserFolder);
    if (!FileSystem_1.FileSystem.exists(homeFolder)) {
        throw new Error(dirError);
    }
    _cachedHomeFolder = homeFolder;
    return homeFolder;
}
//# sourceMappingURL=getHomeFolder.js.map