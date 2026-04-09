// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as path from 'node:path';
import { FileSystem } from '../FileSystem';
let _cachedHomeFolder;
/**
 * Returns the current user's home folder path.
 * Throws if it cannot be determined. Successful results are cached.
 * @public
 */
export function getHomeFolder() {
    if (_cachedHomeFolder !== undefined) {
        return _cachedHomeFolder;
    }
    const unresolvedUserFolder = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    const dirError = "Unable to determine the current user's home directory";
    if (unresolvedUserFolder === undefined) {
        throw new Error(dirError);
    }
    const homeFolder = path.resolve(unresolvedUserFolder);
    if (!FileSystem.exists(homeFolder)) {
        throw new Error(dirError);
    }
    _cachedHomeFolder = homeFolder;
    return homeFolder;
}
//# sourceMappingURL=getHomeFolder.js.map