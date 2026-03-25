export class SymlinkError extends Error {
    path;
    symlink;
    syscall = 'symlink';
    code = 'TAR_SYMLINK_ERROR';
    constructor(symlink, path) {
        super('TAR_SYMLINK_ERROR: Cannot extract through symbolic link');
        this.symlink = symlink;
        this.path = path;
    }
    get name() {
        return 'SymlinkError';
    }
}
//# sourceMappingURL=symlink-error.js.map