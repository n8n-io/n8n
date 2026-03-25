/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IdTokenEntity } from "./IdTokenEntity.js";
import { AccessTokenEntity } from "./AccessTokenEntity.js";
import { RefreshTokenEntity } from "./RefreshTokenEntity.js";
import { AccountEntity } from "./AccountEntity.js";
import { AppMetadataEntity } from "./AppMetadataEntity.js";

/** @internal */
export type CacheRecord = {
    account?: AccountEntity | null;
    idToken?: IdTokenEntity | null;
    accessToken?: AccessTokenEntity | null;
    refreshToken?: RefreshTokenEntity | null;
    appMetadata?: AppMetadataEntity | null;
};
