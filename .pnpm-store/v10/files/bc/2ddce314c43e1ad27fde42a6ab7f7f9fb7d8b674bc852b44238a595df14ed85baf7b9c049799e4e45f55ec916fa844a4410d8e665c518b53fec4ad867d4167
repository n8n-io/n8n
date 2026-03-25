/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TokenCacheContext } from "../persistence/TokenCacheContext.js";

export interface ICachePlugin {
    beforeCacheAccess: (tokenCacheContext: TokenCacheContext) => Promise<void>;
    afterCacheAccess: (tokenCacheContext: TokenCacheContext) => Promise<void>;
}
