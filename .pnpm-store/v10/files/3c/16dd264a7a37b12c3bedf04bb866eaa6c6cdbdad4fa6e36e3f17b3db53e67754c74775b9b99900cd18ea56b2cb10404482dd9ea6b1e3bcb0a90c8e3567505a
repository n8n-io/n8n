import type { CredentialProviderOptions, RuntimeConfigAwsCredentialIdentityProvider } from "@aws-sdk/types";
import { SourceProfileInit } from "@smithy/shared-ini-file-loader";
/**
 * @internal
 */
export interface FromProcessInit extends SourceProfileInit, CredentialProviderOptions {
}
/**
 * @internal
 *
 * Creates a credential provider that will read from a credential_process specified
 * in ini files.
 */
export declare const fromProcess: (init?: FromProcessInit) => RuntimeConfigAwsCredentialIdentityProvider;
