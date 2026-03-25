import { CwdError } from './cwd-error.js';
import { SymlinkError } from './symlink-error.js';
export type MkdirOptions = {
    uid?: number;
    gid?: number;
    processUid?: number;
    processGid?: number;
    umask?: number;
    preserve: boolean;
    unlink: boolean;
    cwd: string;
    mode: number;
};
export type MkdirError = NodeJS.ErrnoException | CwdError | SymlinkError;
/**
 * Wrapper around fs/promises.mkdir for tar's needs.
 *
 * The main purpose is to avoid creating directories if we know that
 * they already exist (and track which ones exist for this purpose),
 * and prevent entries from being extracted into symlinked folders,
 * if `preservePaths` is not set.
 */
export declare const mkdir: (dir: string, opt: MkdirOptions, cb: (er?: null | MkdirError, made?: string) => void) => void | Promise<void>;
export declare const mkdirSync: (dir: string, opt: MkdirOptions) => void | SymlinkError;
//# sourceMappingURL=mkdir.d.ts.map