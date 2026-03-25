import type { RuntimeConfigAwsCredentialIdentityProvider, RuntimeConfigIdentityProvider } from "@aws-sdk/types";
import type { AwsCredentialIdentityProvider } from "@smithy/types";
export interface CustomCredentialChainOptions {
    expireAfter(milliseconds: number): AwsCredentialIdentityProvider & CustomCredentialChainOptions;
}
/**
 * @example
 * ```js
 * import { fromEnv, fromIni, createCredentialChain } from '@aws-sdk/credential-providers';
 * import { S3 } from '@aws-sdk/client-s3';
 *
 * // You can mix existing AWS SDK credential providers
 * // and custom async functions returning credential objects.
 * new S3({
 *   credentials: createCredentialChain(
 *     fromEnv(),
 *     async () => {
 *       // credentials customized by your code...
 *       return credentials;
 *     },
 *     fromIni()
 *   ),
 * });
 *
 * // Set a max duration on the credentials (client side only).
 * // A set expiration will cause the credentials function to be called again
 * // when the time left is less than 5 minutes.
 * new S3({
 *   // expire after 15 minutes (in milliseconds).
 *   credentials: createCredentialChain(fromEnv(), fromIni()).expireAfter(15 * 60_000),
 * });
 *
 * // Apply shared init properties.
 * const init = { logger: console };
 *
 * new S3({
 *   credentials: createCredentialChain(fromEnv(init), fromIni(init)),
 * });
 * ```
 *
 * @param credentialProviders - one or more credential providers.
 * @returns a single AwsCredentialIdentityProvider that calls the given
 * providers in sequence until one succeeds or all fail.
 *
 * @public
 */
export declare const createCredentialChain: (...credentialProviders: RuntimeConfigAwsCredentialIdentityProvider[]) => RuntimeConfigAwsCredentialIdentityProvider & CustomCredentialChainOptions;
/**
 * @internal
 */
export declare const propertyProviderChain: <T>(...providers: Array<RuntimeConfigIdentityProvider<T>>) => RuntimeConfigIdentityProvider<T>;
