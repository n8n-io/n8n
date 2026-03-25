import { AccountEntity } from "../entities/AccountEntity.js";
import { IdTokenEntity } from "../entities/IdTokenEntity.js";
import { AccessTokenEntity } from "../entities/AccessTokenEntity.js";
import { RefreshTokenEntity } from "../entities/RefreshTokenEntity.js";
import { AppMetadataEntity } from "../entities/AppMetadataEntity.js";
import { ServerTelemetryEntity } from "../entities/ServerTelemetryEntity.js";
import { ThrottlingEntity } from "../entities/ThrottlingEntity.js";
import { AuthorityMetadataEntity } from "../entities/AuthorityMetadataEntity.js";
import { AuthenticationScheme } from "../../utils/Constants.js";
import { ScopeSet } from "../../request/ScopeSet.js";
import { AccountInfo } from "../../account/AccountInfo.js";
/** @internal */
export type AccountCache = Record<string, AccountEntity>;
/** @internal */
export type IdTokenCache = Record<string, IdTokenEntity>;
/** @internal */
export type AccessTokenCache = Record<string, AccessTokenEntity>;
/** @internal */
export type RefreshTokenCache = Record<string, RefreshTokenEntity>;
/** @internal */
export type AppMetadataCache = Record<string, AppMetadataEntity>;
/**
 * Object type of all accepted cache types
 * @internal
 */
export type ValidCacheType = AccountEntity | IdTokenEntity | AccessTokenEntity | RefreshTokenEntity | AppMetadataEntity | AuthorityMetadataEntity | ServerTelemetryEntity | ThrottlingEntity | string;
/**
 * Object type of all credential types
 * @internal
 */
export type ValidCredentialType = IdTokenEntity | AccessTokenEntity | RefreshTokenEntity;
/**
 * Account:	<home_account_id>-<environment>-<realm*>
 */
export type AccountFilter = Omit<Partial<AccountInfo>, "idToken" | "idTokenClaims"> & {
    realm?: string;
    loginHint?: string;
    sid?: string;
    isHomeTenant?: boolean;
};
export type TenantProfileFilter = Pick<AccountFilter, "localAccountId" | "loginHint" | "name" | "sid" | "isHomeTenant" | "username">;
/**
 * Credential: <home_account_id*>-<environment>-<credential_type>-<client_id>-<realm*>-<target*>-<scheme*>
 */
export type CredentialFilter = {
    homeAccountId?: string;
    environment?: string;
    credentialType?: string;
    clientId?: string;
    familyId?: string;
    realm?: string;
    target?: ScopeSet;
    userAssertionHash?: string;
    tokenType?: AuthenticationScheme;
    keyId?: string;
    requestedClaimsHash?: string;
};
/**
 * AppMetadata: appmetadata-<environment>-<client_id>
 */
export type AppMetadataFilter = {
    environment?: string;
    clientId?: string;
};
export type TokenKeys = {
    idToken: string[];
    accessToken: string[];
    refreshToken: string[];
};
//# sourceMappingURL=CacheTypes.d.ts.map