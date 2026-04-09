import type { CredentialInit, Credentials } from './internal/credentials.js';
import * as fs from './vfs/index.js';
/**
 * Represents some context used for FS operations
 * @category Backends and Configuration
 */
export interface FSContext {
    root: string;
    readonly credentials: Credentials;
}
/**
 * maybe an FS context
 */
export type V_Context = void | (Partial<FSContext> & object);
/**
 * Allows you to restrict operations to a specific root path and set of credentials.
 * @category Backends and Configuration
 */
export interface BoundContext extends FSContext {
    fs: typeof fs;
}
/**
 * Allows you to restrict operations to a specific root path and set of credentials.
 * Note that the default credentials of a bound context are copied from the global credentials.
 * @category Backends and Configuration
 */
export declare function bindContext(root: string, credentials?: CredentialInit): BoundContext;
