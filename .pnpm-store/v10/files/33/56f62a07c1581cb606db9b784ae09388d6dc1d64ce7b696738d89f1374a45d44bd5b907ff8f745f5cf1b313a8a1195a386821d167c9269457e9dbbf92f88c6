/**
 * Credentials used for various operations.
 * Similar to Linux's cred struct.
 * @category Internals
 * @see https://github.com/torvalds/linux/blob/master/include/linux/cred.h
 */
export interface Credentials {
    uid: number;
    gid: number;
    suid: number;
    sgid: number;
    euid: number;
    egid: number;
    /**
     * List of group IDs.
     */
    groups: number[];
}
/**
 * @category Internals
 */
export declare const credentials: Credentials;
/**
 * Initialization for a set of credentials
 * @category Internals
 */
export interface CredentialInit extends Partial<Credentials> {
    uid: number;
    gid: number;
}
/**
 * @category Internals
 */
export declare function createCredentials(source: CredentialInit): Credentials;
/**
 * Uses credentials from the provided uid and gid.
 * @category Internals
 */
export declare function useCredentials(source: CredentialInit): void;
