import type { AuthenticationRecord, MsalAccountInfo, MsalToken, ValidMsalToken } from "./types.js";
import type { CredentialLogger } from "../util/logging.js";
import type { AzureLogLevel } from "@azure/logger";
import type { GetTokenOptions } from "@azure/core-auth";
import { msalCommon } from "./msal.js";
export interface ILoggerCallback {
    (level: msalCommon.LogLevel, message: string, containsPii: boolean): void;
}
/**
 * Ensures the validity of the MSAL token
 * @internal
 */
export declare function ensureValidMsalToken(scopes: string | string[], msalToken?: MsalToken | null, getTokenOptions?: GetTokenOptions): asserts msalToken is ValidMsalToken;
/**
 * Returns the authority host from either the options bag or the AZURE_AUTHORITY_HOST environment variable.
 *
 * Defaults to {@link DefaultAuthorityHost}.
 * @internal
 */
export declare function getAuthorityHost(options?: {
    authorityHost?: string;
}): string;
/**
 * Generates a valid authority by combining a host with a tenantId.
 * @internal
 */
export declare function getAuthority(tenantId: string, host?: string): string;
/**
 * Generates the known authorities.
 * If the Tenant Id is `adfs`, the authority can't be validated since the format won't match the expected one.
 * For that reason, we have to force MSAL to disable validating the authority
 * by sending it within the known authorities in the MSAL configuration.
 * @internal
 */
export declare function getKnownAuthorities(tenantId: string, authorityHost: string, disableInstanceDiscovery?: boolean): string[];
/**
 * Generates a logger that can be passed to the MSAL clients.
 * @param credLogger - The logger of the credential.
 * @internal
 */
export declare const defaultLoggerCallback: (logger: CredentialLogger, platform?: "Node" | "Browser") => ILoggerCallback;
/**
 * @internal
 */
export declare function getMSALLogLevel(logLevel: AzureLogLevel | undefined): msalCommon.LogLevel;
/**
 * Wraps core-util's randomUUID in order to allow for mocking in tests.
 * This prepares the library for the upcoming core-util update to ESM.
 *
 * @internal
 * @returns A string containing a random UUID
 */
export declare function randomUUID(): string;
/**
 * Handles MSAL errors.
 */
export declare function handleMsalError(scopes: string[], error: Error, getTokenOptions?: GetTokenOptions): Error;
export declare function publicToMsal(account: AuthenticationRecord): msalCommon.AccountInfo;
export declare function msalToPublic(clientId: string, account: MsalAccountInfo): AuthenticationRecord;
/**
 * Serializes an `AuthenticationRecord` into a string.
 *
 * The output of a serialized authentication record will contain the following properties:
 *
 * - "authority"
 * - "homeAccountId"
 * - "clientId"
 * - "tenantId"
 * - "username"
 * - "version"
 *
 * To later convert this string to a serialized `AuthenticationRecord`, please use the exported function `deserializeAuthenticationRecord()`.
 */
export declare function serializeAuthenticationRecord(record: AuthenticationRecord): string;
/**
 * Deserializes a previously serialized authentication record from a string into an object.
 *
 * The input string must contain the following properties:
 *
 * - "authority"
 * - "homeAccountId"
 * - "clientId"
 * - "tenantId"
 * - "username"
 * - "version"
 *
 * If the version we receive is unsupported, an error will be thrown.
 *
 * At the moment, the only available version is: "1.0", which is always set when the authentication record is serialized.
 *
 * @param serializedRecord - Authentication record previously serialized into string.
 * @returns AuthenticationRecord.
 */
export declare function deserializeAuthenticationRecord(serializedRecord: string): AuthenticationRecord;
//# sourceMappingURL=utils.d.ts.map