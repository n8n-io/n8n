"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceLocation = void 0;
const node_url_1 = require("node:url");
/**
 * The source location where a given API item is declared.
 *
 * @remarks
 * The source location points to the `.ts` source file where the API item was originally
   declared. However, in some cases, if source map resolution fails, it falls back to pointing
   to the `.d.ts` file instead.
 *
 * @public
 */
class SourceLocation {
    constructor(options) {
        this._projectFolderUrl = options.projectFolderUrl;
        this._fileUrlPath = options.fileUrlPath;
    }
    /**
     * Returns the file URL to the given source location. Returns `undefined` if the file URL
     * cannot be determined.
     */
    get fileUrl() {
        if (this._projectFolderUrl === undefined || this._fileUrlPath === undefined) {
            return undefined;
        }
        let projectFolderUrl = this._projectFolderUrl;
        if (!projectFolderUrl.endsWith('/')) {
            projectFolderUrl += '/';
        }
        const url = new node_url_1.URL(this._fileUrlPath, projectFolderUrl);
        return url.href;
    }
}
exports.SourceLocation = SourceLocation;
//# sourceMappingURL=SourceLocation.js.map