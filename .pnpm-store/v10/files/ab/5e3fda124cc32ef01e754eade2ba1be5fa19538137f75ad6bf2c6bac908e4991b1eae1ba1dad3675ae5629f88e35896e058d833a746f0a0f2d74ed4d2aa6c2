// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { URL } from 'node:url';
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
export class SourceLocation {
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
        const url = new URL(this._fileUrlPath, projectFolderUrl);
        return url.href;
    }
}
//# sourceMappingURL=SourceLocation.js.map