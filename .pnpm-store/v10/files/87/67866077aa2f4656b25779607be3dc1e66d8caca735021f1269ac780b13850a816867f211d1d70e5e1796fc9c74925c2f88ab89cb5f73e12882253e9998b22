import type { AwsCredentialIdentity, ChecksumConstructor, HashConstructor } from "@smithy/types";
/**
 * Create a string describing the scope of credentials used to sign a request.
 *
 * @internal
 *
 * @param shortDate - the current calendar date in the form YYYYMMDD.
 * @param region    - the AWS region in which the service resides.
 * @param service   - the service to which the signed request is being sent.
 */
export declare const createScope: (shortDate: string, region: string, service: string) => string;
/**
 * Derive a signing key from its composite parts.
 *
 * @internal
 *
 * @param sha256Constructor - a constructor function that can instantiate SHA-256
 *                          hash objects.
 * @param credentials       - the credentials with which the request will be
 *                          signed.
 * @param shortDate         - the current calendar date in the form YYYYMMDD.
 * @param region            - the AWS region in which the service resides.
 * @param service           - the service to which the signed request is being
 *                          sent.
 */
export declare const getSigningKey: (sha256Constructor: ChecksumConstructor | HashConstructor, credentials: AwsCredentialIdentity, shortDate: string, region: string, service: string) => Promise<Uint8Array>;
/**
 * @internal
 */
export declare const clearCredentialCache: () => void;
